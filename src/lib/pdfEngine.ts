import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PurchaseOrderItemPdf {
  code: string;
  name: string;
  currentStock?: number;
  requestedQty: number;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
}

export interface PurchaseOrderPdfData {
  orderNumber: string;
  orderDate: string;
  supplierName: string;
  supplierPhone?: string;
  items: PurchaseOrderItemPdf[];
  notes?: string;
  totalAmount?: number;
}

export interface GeneratedPdfResult {
  blob: Blob;
  base64: string;
  fileName: string;
  download: () => void;
  shareViaWebShare: (title?: string) => Promise<boolean>;
}

/**
 * Renders an official A4 Purchase Order PDF in Arabic with Dubai typography & Western numerals (0-9).
 */
export async function generatePurchaseOrderPdf(data: PurchaseOrderPdfData): Promise<GeneratedPdfResult> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '800px';
  container.style.padding = '32px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Dubai', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.direction = 'rtl';
  container.style.boxSizing = 'border-box';

  const totalItemsCount = data.items.length;
  const totalUnitsCount = data.items.reduce((sum, i) => sum + (Number(i.requestedQty) || 0), 0);
  const totalCostCalc = data.totalAmount ?? data.items.reduce((sum, i) => sum + (Number(i.totalPrice) || (Number(i.requestedQty) * Number(i.unitPrice || 0))), 0);

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 24px; background: #ffffff;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px;">
        <div style="text-align: right;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #059669;">صيدلية بيتك 🌿</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #64748b;">منظومة إدارة المشتريات والمخزون الصيدلاني</p>
        </div>
        <div style="text-align: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px 16px;">
          <span style="display: block; font-size: 10px; font-weight: 800; color: #475569;">نوع المستند</span>
          <span style="font-size: 14px; font-weight: 900; color: #0f172a;">أمر شراء وتوريد رسمي</span>
        </div>
        <div style="text-align: left; direction: ltr;">
          <div style="font-size: 11px; font-weight: 800; color: #0f172a;">PO: <b>${data.orderNumber}</b></div>
          <div style="font-size: 10px; font-weight: 700; color: #64748b;">Date: <b>${data.orderDate}</b></div>
        </div>
      </div>

      <!-- Supplier Info Box -->
      <div style="display: flex; justify-content: space-between; background: #f1f5f9; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; font-size: 11px;">
        <div>
          <span style="color: #64748b; font-weight: 700;">الموجه إليه (المورد / الشركة): </span>
          <strong style="color: #0f172a; font-size: 12px;">${data.supplierName || 'السادة / مندوب التوريد المحترم'}</strong>
        </div>
        ${data.supplierPhone ? `<div><span style="color: #64748b; font-weight: 700;">الهاتف: </span><strong style="direction: ltr; font-family: monospace;">${data.supplierPhone}</strong></div>` : ''}
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 8px 6px; text-align: center; width: 35px; border-radius: 0 8px 0 0;">#</th>
            <th style="padding: 8px 6px; text-align: right;">كود الصنف</th>
            <th style="padding: 8px 6px; text-align: right;">اسم الدواء والمستحضر</th>
            <th style="padding: 8px 6px; text-align: center; width: 90px;">الرصيد الحالي</th>
            <th style="padding: 8px 6px; text-align: center; width: 90px; background: #059669;">الكمية المطلوبة</th>
            <th style="padding: 8px 6px; text-align: left; width: 90px; border-radius: 8px 0 0 0;">الإجمالي التقديري</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, idx) => `
            <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px; text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
              <td style="padding: 6px; font-family: monospace; font-weight: 700; color: #0284c7;">${item.code}</td>
              <td style="padding: 6px; font-weight: 800; color: #0f172a;">${item.name}</td>
              <td style="padding: 6px; text-align: center; font-weight: bold; color: #64748b;">${item.currentStock ?? '-'}</td>
              <td style="padding: 6px; text-align: center; font-weight: 900; color: #059669; font-size: 13px; background: rgba(16, 185, 129, 0.08);">${item.requestedQty} علبة</td>
              <td style="padding: 6px; text-align: left; font-weight: 800; color: #0f172a; direction: ltr;">${(item.totalPrice || (item.requestedQty * (item.unitPrice || 0))).toFixed(2)} د.ل</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Summary & Notes -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 10px;">
          <strong style="color: #475569; display: block; margin-bottom: 4px;">ملاحظات وتعليمات الاستلام:</strong>
          <p style="margin: 0; color: #64748b; font-weight: 600;">${data.notes || 'الرجاء التأكد من تواريخ الصلاحية (لا تقل عن 12 شهراً) وإرفاق الفاتورة الرسمية مع الشحنة.'}</p>
        </div>

        <div style="width: 260px; background: #f1f5f9; border-radius: 12px; padding: 12px 16px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b; font-weight: 700;">عدد الأصناف:</span>
            <strong style="color: #0f172a;">${totalItemsCount} صنف</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748b; font-weight: 700;">إجمالي العلب:</span>
            <strong style="color: #059669;">${totalUnitsCount} علبة</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 13px;">
            <span style="font-weight: 900; color: #0f172a;">القيمة التقديرية:</span>
            <strong style="color: #059669; font-weight: 900;">${totalCostCalc.toFixed(2)} د.ل</strong>
          </div>
        </div>
      </div>

      <!-- Signatures Footer -->
      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 16px; font-size: 10px; color: #64748b;">
        <div style="text-align: center; width: 180px;">
          <span style="font-weight: 700;">مسؤول المشتريات والطلبيات</span>
          <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 4px;">التوقيع والاعتماد</div>
        </div>
        <div style="text-align: center; width: 180px;">
          <span style="font-weight: 700;">ختم إدارة الصيدلية</span>
          <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 4px;">صيدلية بيتك 🌿</div>
        </div>
        <div style="text-align: center; width: 180px;">
          <span style="font-weight: 700;">استلام وتأكيد المندوب</span>
          <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 4px;">التاريخ والتوقيع</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));

    const fileName = `طلب_شراء_${data.orderNumber || Date.now()}.pdf`;
    const blob = pdf.output('blob');
    const base64 = pdf.output('datauristring').split(',')[1];

    const download = () => {
      pdf.save(fileName);
    };

    const shareViaWebShare = async (title?: string): Promise<boolean> => {
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: title || `طلب شراء صيدلية بيتك - ${data.orderNumber}`,
              text: `مرفق أمر شراء أدوية رسمي (${data.items.length} صنف).`,
              files: [file]
            });
            return true;
          } catch (e) {
            console.warn('WebShare cancelled or failed:', e);
            return false;
          }
        }
      }
      // Fallback to download
      download();
      return false;
    };

    return {
      blob,
      base64,
      fileName,
      download,
      shareViaWebShare
    };
  } finally {
    document.body.removeChild(container);
  }
}
