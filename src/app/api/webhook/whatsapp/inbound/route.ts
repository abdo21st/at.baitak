import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseWhatsAppMessageToShortages } from '@/lib/whatsappShortageParser';
import { analyzeMedicineImageText } from '@/lib/whatsappImageOCR';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhook/whatsapp/inbound
 * Receives incoming WhatsApp group / direct messages from WAHA or n8n,
 * verifies that the message comes strictly from the authorized WhatsApp group,
 * parses shortage items with AI/Clinical parser, and stores them in PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // 1. Extract message text and metadata from WAHA / n8n / direct format
    let messageText = '';
    let chatId = '';
    let groupName = '';
    let senderName = 'عضو مجموعة الواتساب';
    let senderPhone = '';
    let imageUrl: string | null = null;
    let mediaType: string | null = null;

    // A. WAHA Webhook Payload Format
    if (rawBody.event === 'message' || rawBody.event === 'message.any' || rawBody.payload?.body || rawBody.payload?.hasMedia) {
      const p = rawBody.payload || rawBody;
      messageText = p.body || p.text || p.caption || '';
      chatId = p.from || p.chatId || '';
      senderName = p.pushName || p._data?.notifyName || 'صيدلي';
      senderPhone = (p.from || '').replace(/[^0-9]/g, '');
      groupName = p._data?.chat?.name || p.groupName || '';

      // Check for attached photo / media
      if (p.hasMedia || p.media || p.mimetype?.startsWith('image/') || p.type === 'image') {
        mediaType = 'IMAGE';
        const rawMediaUrl = p.mediaUrl || p.media?.url || (p.media?.filename ? `http://127.0.0.1:3000/api/files/default/${p.media.filename}` : null);
        
        if (p.media?.data) {
          imageUrl = `data:${p.media.mimetype || 'image/jpeg'};base64,${p.media.data}`;
        } else if (rawMediaUrl) {
          try {
            const wahaApiKey = process.env.WAHA_API_KEY || 'hodoork_waha_secure_2026';
            const fetchUrl = rawMediaUrl.replace('127.0.0.1:3000', '102.203.201.52:3008').replace('localhost:3000', '102.203.201.52:3008');
            const imgRes = await fetch(fetchUrl, {
              headers: { 'X-Api-Key': wahaApiKey }
            });
            if (imgRes.ok) {
              const arrayBuffer = await imgRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const mime = imgRes.headers.get('content-type') || 'image/jpeg';
              imageUrl = `data:${mime};base64,${buffer.toString('base64')}`;
            } else {
              imageUrl = rawMediaUrl;
            }
          } catch (e) {
            imageUrl = rawMediaUrl;
          }
        }

        if (!messageText && p.caption) {
          messageText = p.caption;
        }
      }
    }
    // B. Direct JSON or n8n Normalized Payload Format
    else if (rawBody.message || rawBody.text || rawBody.imageUrl) {
      messageText = rawBody.message || rawBody.text || '';
      chatId = rawBody.chatId || rawBody.from || '';
      groupName = rawBody.groupName || '';
      senderName = rawBody.senderName || rawBody.name || 'صيدلي';
      senderPhone = rawBody.senderPhone || rawBody.phone || '';
      imageUrl = rawBody.imageUrl || rawBody.photo || null;
      if (imageUrl) mediaType = 'IMAGE';
    }

    // 2. Fetch configured authorized WhatsApp groups from CompanySettings & PharmacySettings
    const allSettings = await prisma.companySettings.findMany();
    const pharmacySettings = await prisma.pharmacySettings.findFirst();

    // Default whitelist
    const allowedJids = new Set<string>([
      '120363044711297774@g.us',
      '120363045076046006@g.us',
      '120363028470615058@g.us',
      '120363420679229765@g.us',
      '120363424241099883@g.us'
    ]);
    const allowedNames: string[] = ['بيتك', 'صيدلية بيتك'];
    let targetTenantId = 'default-tenant';

    // Populate from database settings
    for (const setting of allSettings) {
      if (setting.whatsappGroupJid && setting.whatsappGroupJid.trim()) {
        allowedJids.add(setting.whatsappGroupJid.trim());
      }
      if (setting.whatsappGroupName && setting.whatsappGroupName.trim()) {
        allowedNames.push(setting.whatsappGroupName.trim());
      }
      if (setting.whatsappGroupLink && setting.whatsappGroupLink.trim()) {
        const link = setting.whatsappGroupLink.trim();
        // If link contains JID
        const jidMatch = link.match(/(\d{15,20}@g\.us)/);
        if (jidMatch) allowedJids.add(jidMatch[1]);
      }
      if (setting.tenantId) {
        targetTenantId = setting.tenantId;
      }
    }

    if (pharmacySettings) {
      if (pharmacySettings.whatsappGroupJid && pharmacySettings.whatsappGroupJid.trim()) {
        allowedJids.add(pharmacySettings.whatsappGroupJid.trim());
      }
      if (pharmacySettings.whatsappGroupName && pharmacySettings.whatsappGroupName.trim()) {
        allowedNames.push(pharmacySettings.whatsappGroupName.trim());
      }
    }

    const isGroupMessage = chatId.includes('@g.us');
    const isWhitelistedJid = allowedJids.has(chatId);
    const normalizedGroupName = (groupName || '').toLowerCase();
    const isMatchingConfiguredName = allowedNames.some(name => {
      const cleanName = name.toLowerCase().trim();
      return cleanName && (normalizedGroupName.includes(cleanName) || cleanName.includes(normalizedGroupName));
    });

    // 3. Strict Group Filtering: Reject if group is NOT authorized
    if (isGroupMessage && !isWhitelistedJid && !isMatchingConfiguredName) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: 'NOT_AUTHORIZED_GROUP',
        message: `تم تجاهل الرسالة لأنها واردة من مجموعة غير معتمدة (${chatId} - ${groupName || 'بدون اسم'}). يُرجى ضبط رابط أو معرف المجموعة المعتمدة في إعدادات المنظومة 🔒`,
        storedCount: 0
      });
    }

    const effectiveGroupName = groupName || 'مجموعة صيدلية بيتك';

    // 4. Reject non-pharmacy conversational / spam text
    const NON_PHARMACY_KEYWORDS = ['بنزين', 'وقود', 'محطة', 'طوابير', 'سوق سيارات', 'بيع سيارات', 'شحن شدات', 'تفريغ وعبي'];
    if (NON_PHARMACY_KEYWORDS.some(kw => messageText.includes(kw))) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: 'NON_PHARMACY_CONTENT',
        message: 'تم تجاهل الرسالة لأن محتواها غير متعلق بالأدوية أو الصيدلية 🔒',
        storedCount: 0
      });
    }

    // 5. If message contains an attached photo (Medicine Box / Prescription / Leaflet)
    if (imageUrl) {
      const extractedDrug = await analyzeMedicineImageText(messageText, imageUrl);

      const imageRecord = await prisma.whatsAppShortageRequest.create({
        data: {
          tenantId: targetTenantId,
          chatId,
          groupName: effectiveGroupName,
          senderName,
          senderPhone,
          rawMessage: messageText || `[صورة علبة دواء: ${extractedDrug.productName}]`,
          productName: extractedDrug.productName,
          matchedCode: extractedDrug.matchedCode,
          activeIngredient: extractedDrug.activeIngredient,
          requestedQty: extractedDrug.requestedQty ?? null,
          unit: extractedDrug.unit || 'عبوة',
          urgency: extractedDrug.urgency || 'HIGH',
          status: 'PENDING',
          imageUrl,
          mediaType: 'IMAGE',
          notes: extractedDrug.clinicalNotes || 'تم استخراج البيانات ومطابقتها مع BNF 83 والمصادر الدوائية 📸'
        }
      });

      return NextResponse.json({
        success: true,
        message: `تم التعرف على الصنف (${extractedDrug.productName}) وحفظه مع الصورة والبيانات السريرية بنجاح 📸🌿`,
        storedCount: 1,
        items: [imageRecord]
      });
    }

    if (!messageText || !messageText.trim()) {
      return NextResponse.json({ success: false, error: 'لم يتم استلام أي نص أو صورة' }, { status: 400 });
    }

    // 6. Parse shortage items using clinical NLP parser
    const parsedItems = await parseWhatsAppMessageToShortages(messageText);

    if (parsedItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'تم استلام الرسالة ولكن لم يتم العثور على أصناف نواقص واضحة فيها.',
        storedCount: 0
      });
    }

    // 7. Store items in PostgreSQL (WhatsAppShortageRequest)
    const createdRecords = [];
    for (const item of parsedItems) {
      const record = await prisma.whatsAppShortageRequest.create({
        data: {
          tenantId: targetTenantId,
          chatId,
          groupName: effectiveGroupName,
          senderName,
          senderPhone,
          rawMessage: item.rawLine,
          productName: item.productName,
          matchedCode: item.matchedCode,
          activeIngredient: item.activeIngredient,
          requestedQty: item.requestedQty,
          unit: item.unit,
          urgency: item.urgency,
          status: 'PENDING',
          imageUrl,
          mediaType,
          notes: item.notes
        }
      });
      createdRecords.push(record);
    }

    return NextResponse.json({
      success: true,
      message: `تم تفريغ وحفظ ${createdRecords.length} صنفاً في قائمة النواقص السحابية بنجاح 🟢`,
      storedCount: createdRecords.length,
      items: createdRecords
    });
  } catch (error: any) {
    console.error('Error processing inbound WhatsApp shortage message:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء معالجة رسالة الواتساب', details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhook/whatsapp/inbound
 * Health check & webhook verification
 */
export async function GET() {
  const count = await prisma.whatsAppShortageRequest.count().catch(() => 0);
  return NextResponse.json({
    status: 'ONLINE',
    service: 'HodoorK WhatsApp Group Inbound Webhook Listener',
    totalStoredRequests: count,
    timestamp: new Date().toISOString()
  });
}
