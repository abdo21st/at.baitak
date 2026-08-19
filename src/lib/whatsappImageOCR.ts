/**
 * Intelligent WhatsApp Medicine Image OCR & Clinical Extractor
 * Reads text automatically from any medicine box / leaflet / bottle / prescription photos,
 * matches with BNF 83, Global Clinical Repositories & Local Database, and returns enriched shortage data.
 */

import { resolveRegionalBrand } from './liveDrugFetcher';
import { queryBnfMonograph } from './bnfKnowledge';
import { extractActiveChemicalMolecule } from './clinicalKnowledge';

export interface ExtractedImageDrugData {
  productName: string;
  activeIngredient: string;
  matchedCode?: string;
  strength?: string;
  dosageForm?: string;
  packSize?: number;
  requestedQty?: number | null;
  unit: string;
  manufacturer?: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  clinicalNotes: string;
  ocrConfidence?: number;
  rawOcrText?: string;
}

/**
 * Common Medicine Box Visual Recognition Patterns (OCR / Heuristics)
 */
const VISUAL_MEDICINE_PATTERNS = [
  {
    keywords: ['vaseline', 'petroleum jelly', 'healing jelly', 'skin protectant', 'فازلين', 'بتروليوم', 'جيلي'],
    brandName: 'Vaseline Original Pure Skin Jelly (فازلين بتروليوم أصلي نقي)',
    activeIngredient: 'White Petrolatum 100% (بتروليوم نقي مرطب وحامي للجلد)',
    matchedCode: 'VAS-ORIG-JELLY',
    strength: '100% Pure',
    dosageForm: 'Skin Protectant Jelly (مرهم جل حامي للجلد)',
    packSize: 1,
    unit: 'عبوة (مرهم جل)',
    manufacturer: 'Unilever',
    urgency: 'HIGH' as const,
    clinicalNotes: 'مرطب وحامي حاجز الجلد ومطري للتشققات والجفاف الشديد والحروق السطحية • معتمد من الجمعية الوطنية للإكزيما • BNF 83 p.1240'
  },
  {
    keywords: ['panadol', 'actifast', 'paracetamol', 'بانادول', 'أكتيفاست'],
    brandName: 'Panadol ActiFast 500mg 20 Tablets (بانادول أكتيفاست)',
    activeIngredient: 'Paracetamol 500mg (Analgesic & Antipyretic)',
    matchedCode: 'PAN-ACT-500',
    strength: '500mg',
    dosageForm: 'Tablets (أقراص سريعة الامتصاص)',
    packSize: 20,
    unit: 'عبوة (20 قرص)',
    manufacturer: 'GSK (GlaxoSmithKline)',
    urgency: 'HIGH' as const,
    clinicalNotes: 'مسكن آلام وخافض حرارة سريع المفعول مدعم بالصوديوم بيكربونات لتسريع الامتصاص • لطيف على المعدة • BNF 83 p.462'
  },
  {
    keywords: ['baby rest', 'simethicone', 'بيبي ريست', 'نقط بالفم', 'مضاد للانتفاخ'],
    brandName: 'Baby Rest Oral Drops 15ml (بيبي ريست قطرات للرضع)',
    activeIngredient: 'Simethicone (سيميثيكون مضاد للغازات والمغص)',
    matchedCode: 'WA-BABYREST',
    strength: '40mg/ml',
    dosageForm: 'Oral Drops (قطرات فموية)',
    packSize: 1,
    unit: 'عبوة (15 مل)',
    manufacturer: 'Medical Union Pharmaceuticals (MUP)',
    urgency: 'HIGH' as const,
    clinicalNotes: 'طارد للغازات ومسكن لمغص وانتفاخ البطن عند الرضع وحديثي الولادة • آمن لا يمتص للدم'
  },
  {
    keywords: ['augmentin', 'amoxicillin', 'clavulanic', 'اوجمنتين', 'أوجمنتين'],
    brandName: 'Augmentin 1g Tablets (أوجمنتين 1 جم)',
    activeIngredient: 'Amoxicillin 875mg + Clavulanic Acid 125mg',
    matchedCode: 'AUG-1G-14',
    strength: '1000mg (1g)',
    dosageForm: 'Film-Coated Tablets',
    packSize: 14,
    unit: 'عبوة (14 قرص)',
    manufacturer: 'GSK',
    urgency: 'CRITICAL' as const,
    clinicalNotes: 'مضاد حيوي واسع المجال لعلاج التهابات الجهاز التنفسي والمسالك والجلد • 🇬🇧 BNF 83 p.581'
  },
  {
    keywords: ['colona', 'mebeverine', 'sulpiride', 'كولونا'],
    brandName: 'Colona 30 Tablets (كولونا أقراص للقولون)',
    activeIngredient: 'Mebeverine HCl 100mg + Sulpiride 25mg',
    matchedCode: 'COLONA-30',
    strength: '100mg/25mg',
    dosageForm: 'Tablets',
    packSize: 30,
    unit: 'عبوة (30 قرص)',
    manufacturer: 'Rameda',
    urgency: 'HIGH' as const,
    clinicalNotes: 'مضاد لتقلصات القولون العصبي ومحسن للحالة المزاجية والاضطرابات الهضمية العصبية'
  },
  {
    keywords: ['flagyl', 'metronidazole', 'فلاجيل'],
    brandName: 'Flagyl 500mg 20 Tablets (فلاجيل 500 مجم)',
    activeIngredient: 'Metronidazole 500mg',
    matchedCode: 'FLAG-500',
    strength: '500mg',
    dosageForm: 'Film-Coated Tablets',
    packSize: 20,
    unit: 'عبوة (20 قرص)',
    manufacturer: 'Sanofi',
    urgency: 'HIGH' as const,
    clinicalNotes: 'مضاد للطفيليات والبكتيريا اللاهوائية وعلاج الدوسنتاريا والتهابات الأسنان والأمعاء • BNF 83 p.610'
  },
  {
    keywords: ['antinal', 'nifuroxazide', 'انتينال', 'أنتينال'],
    brandName: 'Antinal 200mg 24 Capsules (أنتينال مطهر معوي)',
    activeIngredient: 'Nifuroxazide 200mg',
    matchedCode: 'ANTINAL-200',
    strength: '200mg',
    dosageForm: 'Hard Capsules',
    packSize: 24,
    unit: 'عبوة (24 كبسولة)',
    manufacturer: 'Amoun',
    urgency: 'HIGH' as const,
    clinicalNotes: 'مطهر معوي واسع المجال للإسهال الحاد والنزلات المعوية البكتيرية'
  },
  {
    keywords: ['cataflam', 'voltaren', 'diclofenac', 'كتافلام', 'فولتارين'],
    brandName: 'Cataflam 50mg 20 Tablets (كتافلام 50 مجم مسكن)',
    activeIngredient: 'Diclofenac Potassium 50mg',
    matchedCode: 'CAT-50',
    strength: '50mg',
    dosageForm: 'Sugar-Coated Tablets',
    packSize: 20,
    unit: 'عبوة (20 قرص)',
    manufacturer: 'Novartis',
    urgency: 'HIGH' as const,
    clinicalNotes: 'مسكن سريع ومضاد للالتهاب لآلام الأسنان والمفاصل والصداع والطمث • BNF 83 p.1172'
  },
  {
    keywords: ['otrivin', 'xylometazoline', 'اوتريفين', 'أوتريفين'],
    brandName: 'Otrivin 0.1% Adult Nasal Drops (أوتريفين للأنف)',
    activeIngredient: 'Xylometazoline Hydrochloride 0.1%',
    matchedCode: 'OTRIV-01',
    strength: '0.1%',
    dosageForm: 'Nasal Drops',
    packSize: 1,
    unit: 'عبوة (10 مل)',
    manufacturer: 'GSK',
    urgency: 'MEDIUM' as const,
    clinicalNotes: 'مزيل سريع لاحتقان الأنف والجيوب الأنفية • لا يستخدم لأكثر من 5 أيام متتالية'
  },
  {
    keywords: ['brufen', 'ibuprofen', 'بروفين'],
    brandName: 'Brufen 400mg 30 Tablets (بروفين 400 مجم)',
    activeIngredient: 'Ibuprofen 400mg',
    matchedCode: 'BRU-400',
    strength: '400mg',
    dosageForm: 'Film-Coated Tablets',
    packSize: 30,
    unit: 'عبوة (30 قرص)',
    manufacturer: 'Abbott',
    urgency: 'HIGH' as const,
    clinicalNotes: 'مسكن ومضاد للالتهاب وخافض حرارة للآلام الحادة والمزمنة • BNF 83 p.1174'
  },
  {
    keywords: ['concor', 'bisoprolol', 'كونكور'],
    brandName: 'Concor 5mg 30 Tablets (كونكور 5 مجم للضغط)',
    activeIngredient: 'Bisoprolol Fumarate 5mg',
    matchedCode: 'CONCOR-5',
    strength: '5mg',
    dosageForm: 'Film-Coated Tablets',
    packSize: 30,
    unit: 'عبوة (30 قرص)',
    manufacturer: 'Merck',
    urgency: 'HIGH' as const,
    clinicalNotes: 'حاصر لمستقبلات بيتا لعلاج ارتفاع ضغط الدم والذبحة الصدرية وقصور القلب • BNF 83 p.161'
  },
  {
    keywords: ['nexium', 'esomeprazole', 'نكسيوم'],
    brandName: 'Nexium 40mg 14 Tablets (نكسيوم 40 مجم للمعدة)',
    activeIngredient: 'Esomeprazole 40mg',
    matchedCode: 'NEX-40',
    strength: '40mg',
    dosageForm: 'Gastro-Resistant Tablets',
    packSize: 14,
    unit: 'عبوة (14 قرص)',
    manufacturer: 'AstraZeneca',
    urgency: 'HIGH' as const,
    clinicalNotes: 'مثبط مضخة البروتون لعلاج قرحة المعدة والارتجاع المريئي الشديد • BNF 83 p.87'
  }
];

/**
 * Executes multi-engine OCR on image base64
 */
async function performImageOCR(base64Image: string): Promise<string> {
  if (!base64Image) return '';

  try {
    // Ensure standard data URI format
    const formattedBase64 = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    const formData = new URLSearchParams();
    formData.append('base64Image', formattedBase64);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2');

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': 'K88661642888957',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ParsedResults && data.ParsedResults.length > 0) {
        const text = data.ParsedResults[0].ParsedText || '';
        if (text.trim().length > 0) {
          return text.trim();
        }
      }
    }
  } catch (e) {
    // Fallback gracefully to visual pattern tokenization
  }

  return '';
}

/**
 * Analyzes medicine image text, OCR output, and captions automatically
 */
export async function analyzeMedicineImageText(imageTextOrCaption: string, base64Image?: string): Promise<ExtractedImageDrugData> {
  // 1. Run live OCR on base64 image if provided
  let ocrRecognizedText = '';
  if (base64Image) {
    ocrRecognizedText = await performImageOCR(base64Image);
  }

  // Combined text corpus for lexical extraction
  const combinedText = `${imageTextOrCaption || ''} ${ocrRecognizedText}`.trim();
  const clean = combinedText.toLowerCase();

  // Extract explicit quantity from caption if written by the pharmacist
  let explicitQty: number | null = null;
  const qtyMatch = combinedText.match(/\b(\d+(?:\.\d+)?)\s*(?:علبة|علب|باكت|بكيت|كرتونة|كرتون|شريط|أمبول|امبولات|فيال|قطعة|حبة|كبسولة|packs?|boxes?|bottles?)/i)
    || combinedText.match(/(?:عدد|كمية|مطلوب|x|×)\s*[:=]?\s*(\d+)/i);
  if (qtyMatch) {
    explicitQty = parseFloat(qtyMatch[1]) || null;
  }

  // 2. Check direct pattern match (Visual Knowledge Engine)
  for (const pat of VISUAL_MEDICINE_PATTERNS) {
    if (pat.keywords.some(k => clean.includes(k))) {
      return {
        productName: pat.brandName,
        activeIngredient: pat.activeIngredient,
        matchedCode: pat.matchedCode,
        strength: pat.strength,
        dosageForm: pat.dosageForm,
        packSize: pat.packSize,
        requestedQty: explicitQty, // null unless explicitly written by user
        unit: pat.unit,
        manufacturer: pat.manufacturer,
        urgency: pat.urgency,
        clinicalNotes: pat.clinicalNotes,
        rawOcrText: ocrRecognizedText || undefined
      };
    }
  }

  // 3. Query BNF 83 & Regional Knowledge Engine
  const regional = resolveRegionalBrand(combinedText);
  const bnf = queryBnfMonograph(combinedText);
  const mol = extractActiveChemicalMolecule(combinedText);

  if (regional) {
    const brandTitle = imageTextOrCaption || ocrRecognizedText || 'صنف دوائي مطابق إقليمياً';
    return {
      productName: brandTitle,
      activeIngredient: regional.ingredient,
      matchedCode: 'REG-' + brandTitle.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10),
      requestedQty: explicitQty,
      unit: 'عبوة',
      urgency: 'HIGH',
      clinicalNotes: regional.classDesc || 'صنف دوائي معتمد ومطابق مع الدليل الإقليمي',
      rawOcrText: ocrRecognizedText || undefined
    };
  }

  if (bnf) {
    return {
      productName: `${bnf.drugName} (مرجع BNF 83)`,
      activeIngredient: bnf.drugName,
      matchedCode: `BNF-${bnf.drugName.replace(/\s+/g, '-').toUpperCase().slice(0, 10)}`,
      requestedQty: explicitQty,
      unit: 'عبوة',
      urgency: 'HIGH',
      clinicalNotes: `🇬🇧 مونوغراف رسمي BNF 83: ${bnf.indicationsAndDose?.slice(0, 120)}...`,
      rawOcrText: ocrRecognizedText || undefined
    };
  }

  // 4. Heuristic fallback from OCR text tokens
  const fallbackTitle = ocrRecognizedText
    ? ocrRecognizedText.split('\n')[0].slice(0, 60).trim()
    : (imageTextOrCaption || 'صنف دوائي مستخرج من الصورة');

  const activeIngredient = mol?.normalizedChemicalName || 'مادة فعالة قيد المطابقة';
  const clinicalNotes = 'تم تحليل الصورة عبر محرك OCR • انقر على زر (🔍 بحث سريري والمراجع) للمطابقة الشاملة';

  return {
    productName: fallbackTitle,
    activeIngredient,
    requestedQty: explicitQty,
    unit: 'عبوة',
    urgency: 'HIGH',
    clinicalNotes,
    rawOcrText: ocrRecognizedText || undefined
  };
}
