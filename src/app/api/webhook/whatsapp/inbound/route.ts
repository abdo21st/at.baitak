import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseWhatsAppMessageToShortages } from '@/lib/whatsappShortageParser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhook/whatsapp/inbound
 * Receives incoming WhatsApp group / direct messages from WAHA or n8n,
 * parses shortage items with AI/Clinical parser, and stores them in PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // 1. Extract message text and metadata from WAHA / n8n / direct format
    let messageText = '';
    let chatId = '';
    let groupName = 'مجموعة الصيدلية';
    let senderName = 'عضو مجموعة الواتساب';
    let senderPhone = '';
    let imageUrl: string | null = null;
    let mediaType: string | null = null;

    // A. WAHA Webhook Payload Format
    if (rawBody.event === 'message' || rawBody.event === 'message.any' || rawBody.payload?.body || rawBody.payload?.hasMedia) {
      const p = rawBody.payload || rawBody;
      messageText = p.body || p.text || p.caption || '';
      chatId = p.from || p.chatId || '';
      senderName = p.pushName || p._data?.notifyName || 'صيدلي / عضو المجموعة';
      senderPhone = (p.from || '').replace(/[^0-9]/g, '');
      if (chatId.includes('@g.us')) {
        groupName = p._data?.chat?.name || p.groupName || 'مجموعة نواقص وطلبيات الواتساب';
      }

      // Check for attached photo / media
      if (p.hasMedia || p.media || p.mimetype?.startsWith('image/') || p.type === 'image') {
        mediaType = 'IMAGE';
        imageUrl = p.mediaUrl || p.media?.url || (p.media?.data ? `data:${p.media.mimetype || 'image/jpeg'};base64,${p.media.data}` : null);
        if (!messageText && p.caption) {
          messageText = p.caption;
        }
      }
    }
    // B. Direct JSON or n8n Normalized Payload Format
    else if (rawBody.message || rawBody.text || rawBody.imageUrl) {
      messageText = rawBody.message || rawBody.text || '';
      chatId = rawBody.chatId || rawBody.from || '';
      groupName = rawBody.groupName || 'مجموعة نواقص الواتساب';
      senderName = rawBody.senderName || rawBody.name || 'صيدلي';
      senderPhone = rawBody.senderPhone || rawBody.phone || '';
      imageUrl = rawBody.imageUrl || rawBody.photo || null;
      if (imageUrl) mediaType = 'IMAGE';
    }

    // If message is an image without caption, create a visual review shortage record
    if (!messageText || !messageText.trim()) {
      if (imageUrl) {
        const imageRecord = await prisma.whatsAppShortageRequest.create({
          data: {
            chatId,
            groupName,
            senderName,
            senderPhone,
            rawMessage: '[صورة دواء / روشتة مرفقة من الواتساب]',
            productName: `صورة مرفقة (${senderName})`,
            requestedQty: 1,
            unit: 'صورة',
            urgency: 'HIGH',
            status: 'PENDING',
            imageUrl,
            mediaType: 'IMAGE',
            notes: 'تم استلام صورة من المجموعة تحتاج لمراجعة الصيدلي'
          }
        });

        return NextResponse.json({
          success: true,
          message: 'تم حفظ صورة الدواء/الروشتة في قائمة النواقص للمراجعة البصرية 📸',
          storedCount: 1,
          items: [imageRecord]
        });
      }

      return NextResponse.json({ success: false, error: 'لم يتم استلام أي نص أو صورة' }, { status: 400 });
    }

    // 2. Parse shortage items using clinical NLP parser
    const parsedItems = await parseWhatsAppMessageToShortages(messageText);

    if (parsedItems.length === 0) {
      if (imageUrl) {
        const imageRecord = await prisma.whatsAppShortageRequest.create({
          data: {
            chatId,
            groupName,
            senderName,
            senderPhone,
            rawMessage: messageText,
            productName: messageText.slice(0, 50),
            requestedQty: 1,
            unit: 'عبوة',
            urgency: 'HIGH',
            status: 'PENDING',
            imageUrl,
            mediaType: 'IMAGE',
            notes: 'صورة مع تعليق نصي'
          }
        });
        return NextResponse.json({
          success: true,
          message: 'تم حفظ صورة الصنف مع النص في قائمة النواقص 📸',
          storedCount: 1,
          items: [imageRecord]
        });
      }

      return NextResponse.json({
        success: true,
        message: 'تم استلام الرسالة ولكن لم يتم العثور على أصناف نواقص واضحة فيها.',
        storedCount: 0
      });
    }

    // 3. Store items in PostgreSQL (WhatsAppShortageRequest)
    const createdRecords = [];
    for (const item of parsedItems) {
      const record = await prisma.whatsAppShortageRequest.create({
        data: {
          chatId,
          groupName,
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
