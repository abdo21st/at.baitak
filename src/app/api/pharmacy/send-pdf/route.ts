import { NextRequest, NextResponse } from 'next/server';
import { formatLibyanPhone } from '@/lib/n8n';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, pdfBase64, fileName, orderNumber, supplierName, itemsCount, totalAmount } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف مطلوب للإرسال عبر واتساب' }, { status: 400 });
    }

    if (!pdfBase64) {
      return NextResponse.json({ success: false, error: 'ملف الـ PDF مطلوب' }, { status: 400 });
    }

    const cleanPhone = formatLibyanPhone(phone);
    const chatId = `${cleanPhone}@c.us`;
    const docName = fileName || `طلب_شراء_${orderNumber || Date.now()}.pdf`;
    const caption = `📄 *أمر شراء أدوية رسمي*\nإلى: *${supplierName || 'السادة المورد'}*\nرقم الطلبية: *${orderNumber || 'PO'}*\nعدد الأصناف: *${itemsCount || 0} صنف*\nالقيمة التقديرية: *${Number(totalAmount || 0).toFixed(2)} د.ل*\n\nيرجى الاطلاع على ملف الـ PDF المرفق وتأكيد التوريد.`;

    const wahaUrl = process.env.WAHA_API_URL || 'http://102.203.201.52:3008/api/sendFile';
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://102.203.201.52:5678/webhook/attendance-alert';

    let sendSuccess = false;

    // 1. Try sending directly via WAHA /api/sendFile
    try {
      const res = await fetch(wahaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Api-Key': process.env.WAHA_API_KEY || 'hodoork_waha_secure_2026'
        },
        body: JSON.stringify({
          session: 'default',
          chatId,
          file: {
            mimetype: 'application/pdf',
            filename: docName,
            data: pdfBase64
          },
          caption
        })
      });

      if (res.ok) {
        sendSuccess = true;
      }
    } catch (wahaErr) {
      console.warn('WAHA SendFile notice:', wahaErr);
    }

    // 2. Also forward to n8n Webhook
    try {
      await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          event: 'PURCHASE_ORDER_PDF_SENT',
          timestamp: new Date().toISOString(),
          phone: cleanPhone,
          orderNumber,
          supplierName,
          itemsCount,
          totalAmount,
          fileName: docName,
          caption
        })
      });
    } catch (n8nErr) {
      console.warn('n8n Webhook notice:', n8nErr);
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال أمر الشراء كملف PDF إلى واتساب (${phone}) بنجاح! 📄🟢`,
      directWahaSent: sendSuccess
    });
  } catch (err: any) {
    console.error('Send PDF Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'فشل إرسال ملف الـ PDF' }, { status: 500 });
  }
}
