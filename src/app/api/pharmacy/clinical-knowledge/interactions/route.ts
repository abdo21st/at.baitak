import { NextResponse, NextRequest } from 'next/server';

// Common Dangerous Interactions Knowledge Base (BNF 83 Appendix 1)
const DRUG_INTERACTIONS_RULES: Array<{
  pair: [string, string];
  severity: 'SEVERE' | 'MODERATE' | 'MILD';
  titleArabic: string;
  effectArabic: string;
  actionArabic: string;
  reference: string;
}> = [
  {
    pair: ['warfarin', 'aspirin'],
    severity: 'SEVERE',
    titleArabic: 'وارفارين + أسبرين (Warfarin + Aspirin)',
    effectArabic: 'زيادة شديدة في خطر النزيف الهضمي الحاد والداخلي نتيجة التثبيط المزدوج للتخثر والصفائح.',
    actionArabic: 'تجنب الجمع بينهما إلا بتوصية دقيقة من استشاري القلب مع مراقبة INR الدورية.',
    reference: 'BNF 83 - Anticoagulants & Antiplatelets'
  },
  {
    pair: ['warfarin', 'ibuprofen'],
    severity: 'SEVERE',
    titleArabic: 'وارفارين + إيبوبروفين ومسكنات NSAIDs',
    effectArabic: 'زيادة خطورة النزيف وتآكل الغشاء المخاطي للمعدة بالإضافة لارتفاع INR.',
    actionArabic: 'استبدال الإيبوبروفين بالباراسيتامول كمسكن آمن لمرضى الوارفارين.',
    reference: 'BNF 83 - NSAIDs Interactions'
  },
  {
    pair: ['clarithromycin', 'atorvastatin'],
    severity: 'SEVERE',
    titleArabic: 'كلاريثرومايسين + أتورفاستاتين (Clarithromycin + Atorvastatin)',
    effectArabic: 'تثبيط إنزيم CYP3A4 مما يرفع تركيز الستاتين بالدم ويزيد خطر انحلال الربيدات وتلف العضلات والكلى.',
    actionArabic: 'إيقاف الستاتين مؤقتاً طوال فترة العلاج بالمضاد الحيوي واستئنافه بعد اكتمال الكورس.',
    reference: 'BNF 83 - Macrolides & Statins'
  },
  {
    pair: ['ciprofloxacin', 'antacid'],
    severity: 'MODERATE',
    titleArabic: 'سيبروفلوكساسين + مضادات الحموضة والحديد (Ciprofloxacin + Antacids)',
    effectArabic: 'تكوين مركبات مخلبية غير قابلة للامتصاص مما يقلل فاعلية المضاد الحيوي بنسبة تفوق 70%.',
    actionArabic: 'الفصل الزمني بساعتين على الأقل قبل أو 4 ساعات بعد مضاد الحموضة.',
    reference: 'BNF 83 - Quinolones Absorption'
  },
  {
    pair: ['metformin', 'contrast'],
    severity: 'SEVERE',
    titleArabic: 'ميتفورمين + الصبغات الإشعاعية (Metformin + Iodinated Contrast)',
    effectArabic: 'خطر حدوث الحماض اللبني (Lactic Acidosis) والفشل الكلوي الحاد.',
    actionArabic: 'إيقاف الميتفورمين قبل الفحص الإشعاعي بـ 48 ساعة واستئنافه بعد فحص وظائف الكلى.',
    reference: 'BNF 83 - Antidiabetic Drugs'
  },
  {
    pair: ['ace_inhibitor', 'potassium'],
    severity: 'SEVERE',
    titleArabic: 'مثبطات ACE (كابتوبريل/إنالابريل) + مكملات البوتاسيوم / سبيرونولاكتون',
    effectArabic: 'ارتفاع حاد في بوتاسيوم الدم (Hyperkalaemia) قد يؤدي إلى اضطراب خطير في نبضات القلب.',
    actionArabic: 'مراقبة مستوى البوتاسيوم في الدم وتجنب المكملات العشوائية.',
    reference: 'BNF 83 - Renin-Angiotensin System'
  }
];

// POST: Check interactions for an array of drug names / ingredients
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { drugs } = body; // Array of strings (names or active ingredients)

    if (!Array.isArray(drugs) || drugs.length < 2) {
      return NextResponse.json({ success: true, interactions: [], count: 0 });
    }

    const detectedInteractions: any[] = [];
    const normalizedDrugs = drugs.map((d) => String(d).toLowerCase().trim());

    for (let i = 0; i < normalizedDrugs.length; i++) {
      for (let j = i + 1; j < normalizedDrugs.length; j++) {
        const d1 = normalizedDrugs[i];
        const d2 = normalizedDrugs[j];

        // Check against rules
        for (const rule of DRUG_INTERACTIONS_RULES) {
          const match1 = (d1.includes(rule.pair[0]) && d2.includes(rule.pair[1])) || (d1.includes(rule.pair[1]) && d2.includes(rule.pair[0]));
          if (match1) {
            detectedInteractions.push({
              ...rule,
              drugA: d1,
              drugB: d2
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      interactions: detectedInteractions,
      count: detectedInteractions.length,
      hasSevere: detectedInteractions.some((i) => i.severity === 'SEVERE')
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
