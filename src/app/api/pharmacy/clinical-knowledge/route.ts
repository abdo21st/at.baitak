import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractActiveChemicalMolecule, generateClinicalCapsule, DEFAULT_CLINICAL_PRODUCTS } from '@/lib/clinicalKnowledge';

// Initial default drug profiles to seed into PostgreSQL
const INITIAL_DATABASE_DRUGS = [
  {
    brandPattern: 'colona',
    brandName: 'Colona 30tab*3 Egept',
    activeIngredients: 'Mebeverine Hydrochloride 100mg + Sulpiride 25mg',
    therapeuticClass: 'مهدئ ومضاد لتشنجات القولون العصبي واضطرابات الهضم (Antispasmodic & Anxiolytic)',
    indications: 'علاج متلازمة القولون العصبي (IBS)، المغص المعوي، الانتفاخ، عسر الهضم والتقلصات المصحوبة بالتوتر أو القلق النفسي.',
    dosageAndAdmin: '• قرص واحد 2 إلى 3 مرات يومياً قبل الوجبات بـ 20 دقيقة مع كوب ماء.',
    majorInteractions: ['🔴 المهدئات ومضادات الاكتئاب الأخرى: يزيد من التأثير المهدئ والنعاس.', '🟠 مضادات الحموضة: باعد ساعتين بين تناولها وبين أدوية القولون لتجنب تقليل الامتصاص.'],
    warningsAndContraindications: ['⚠️ يفضل تناوله بانتظام قبل الأكل لتحقيق أقصى ارتخاء لعضلات القولون الملساء.', '✅ آمن لمعظم المرضى ولا يؤثر على ضغط الدم أو حركة الأمعاء الطبيعية.'],
    patientCounselingTip: 'تناول الحبة قبل الأكل بـ 20 دقيقة مع كوب ماء كامل، وتجنب الوجبات الدسمة والمشروبات الغازية لتقليل تهيج القولون.',
    drugBankId: 'DB01254',
    drugBankUrl: 'https://go.drugbank.com/drugs/DB01254',
    sourceReference: 'دليل الأدوية المصري (EDA) • DrugEye • Medscape'
  },
  {
    brandPattern: 'librax',
    brandName: 'Librax 30 Tab',
    activeIngredients: 'Chlordiazepoxide 5mg + Clidinium Bromide 2.5mg',
    therapeuticClass: 'مهدئ ومضاد لتقلصات القولون العصبي وقرحة المعدة (Sedative & Antispasmodic)',
    indications: 'علاج تقلصات القولون العصبي، المغص الهضمي، والقرحة الهضمية المصحوبة بالقلق والتوتر العصبي.',
    dosageAndAdmin: '• قرص واحد 3 إلى 4 مرات يومياً قبل الأكل بـ 30 دقيقة وقبل النوم.',
    majorInteractions: ['🔴 المهدئات ومضادات الاكتئاب: تزيد تأثير الخمول والنعاس.', '🟠 مضادات الحموضة: تفصل بساعتين لمنع تقليل الامتصاص.'],
    warningsAndContraindications: ['🚫 يحذر لمرضى المياه الزرقاء (Glaucoma) وتضخم البروستاتا.', '⚠️ يسبب النعاس؛ تجنب القيادة.'],
    patientCounselingTip: 'تناول الحبة قبل الأكل بنصف ساعة وقبل النوم، وتجنب القيادة أو تشغيل الآلات في بداية العلاج.',
    drugBankId: 'DB00475',
    drugBankUrl: 'https://go.drugbank.com/drugs/DB00475',
    sourceReference: 'EMC UK • DailyMed • Drugs.com'
  },
  {
    brandPattern: 'amoxicillin',
    brandName: 'Amoxicillin + Clavulanic Acid (Augmentin / Curam)',
    activeIngredients: 'Amoxicillin 875mg + Clavulanic Acid 125mg (Co-amoxiclav 1g)',
    therapeuticClass: 'مضاد حيوي واسع المجال (Penicillin + Beta-Lactamase Inhibitor)',
    indications: 'علاج العدوى البكتيرية الحادة في الجهاز التنفسي، اللوزتين، الجيوب الأنفية، الأذن الوسطى، المسالك البولية والتهابات الأسنان.',
    dosageAndAdmin: '• قرص 1 غرام كل 12 ساعة في أول لقمة من الطعام.\n• الأطفال: معلق شراب حسب الوزن كل 12 ساعة.',
    majorInteractions: ['🔴 موانع الحمل الفموية: يقلل فعاليتها.', '🔴 وارفارين: يرفع خطر النزيف (INR).', '🟠 ألوبيورينول: يزيد احتمالية الطفح الجلدي.'],
    warningsAndContraindications: ['🚫 ممنوع قطعاً لمرضى حساسية البنسلين ومشتقاته.', '⚠️ الالتزام بإكمال الكورس العلاجي بالكامل.'],
    patientCounselingTip: 'تناول الحبة مع أول لقمة من الأكل لتقليل اضطراب المعدة، واكمل الكورس بالكامل.',
    drugBankId: 'DB01060',
    drugBankUrl: 'https://go.drugbank.com/drugs/DB01060',
    sourceReference: 'EMC UK • Vidal France • DailyMed'
  },
  {
    brandPattern: '123',
    brandName: '1, 2, 3 Cold & Flu (Syrup / Tab)',
    activeIngredients: 'Paracetamol + Pseudoephedrine HCl + Chlorpheniramine Maleate',
    therapeuticClass: 'مركب علاج نزلات البرد والاحتقان (Analgesic + Decongestant + Antihistamine)',
    indications: 'تخفيف أعراض نزلات البرد والإنفلونزا، انسداد واحتقان الأنف، الصداع، سيلان الأنف وآلام الجسم.',
    dosageAndAdmin: '• قرص واحد كل 6-8 ساعات بعد الأكل (أقصى حد 3 مرات يومياً).\n• الأطفال 6-12 سنة: 5 مل 3 مرات يومياً.',
    majorInteractions: ['🔴 أدوية الضغط: يرفع ضغط الدم ويعاكس أدوية الضغط.', '🔴 أدوية الباراسيتامول الأخرى: تجنب التكرار منعاً لتسمم الكبد.'],
    warningsAndContraindications: ['🚫 ممنوع لمرضى الضغط المرتفع غير المنضبط والمياه الزرقاء وتضخم البروستاتا.', '⚠️ يسبب النعاس.'],
    patientCounselingTip: 'تناوله بعد الأكل، وتجنب قيادة السيارة لكونه يسبب النعاس، ولا تأخذ معه أي بنادول إضافي.',
    drugBankId: 'DB00316',
    drugBankUrl: 'https://go.drugbank.com/drugs/DB00316',
    sourceReference: 'DailyMed • Drugs.com • EDA'
  },
  {
    brandPattern: 'antinal',
    brandName: 'Antinal 200mg (Nifuroxazide)',
    activeIngredients: 'Nifuroxazide 200mg (Intestinal Antiseptic)',
    therapeuticClass: 'مطهر معوي واسع المجال للإسهال البكتيري (Intestinal Antibacterial)',
    indications: 'علاج الإسهال الحاد والنزلة المعوية البكتيرية وتطهير الجهاز الهضمي دون الإضرار بالبكتيريا النافعة.',
    dosageAndAdmin: '• كبسولة واحدة كل 6 ساعات (4 مرات يومياً) لمدة 3-5 أيام.\n• الأطفال: 5 مل شراب 3-4 مرات يومياً.',
    majorInteractions: ['🟠 أدوية الامتزاز الأخرى: تفصل بساعتين.'],
    warningsAndContraindications: ['⚠️ شرب السوائل ومحلول الجفاف (ORS) لتعويض الفاقد ومنع الجفاف.'],
    patientCounselingTip: 'تناول الدواء بانتظام كل 6 ساعات وأكثر من شرب الماء، واستمر في العلاج حتى إتمام المدة المقررة.',
    drugBankId: 'DB08801',
    drugBankUrl: 'https://go.drugbank.com/drugs/DB08801',
    sourceReference: 'Vidal France • EDA • SFDA'
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // Check count and seed initial database entries if table is empty
    const count = await prisma.clinicalDrugReference.count();
    if (count === 0) {
      for (const drug of INITIAL_DATABASE_DRUGS) {
        await prisma.clinicalDrugReference.upsert({
          where: { brandPattern: drug.brandPattern },
          create: drug,
          update: drug
        });
      }
    }

    let records;
    if (search) {
      records = await prisma.clinicalDrugReference.findMany({
        where: {
          OR: [
            { brandPattern: { contains: search, mode: 'insensitive' } },
            { brandName: { contains: search, mode: 'insensitive' } },
            { activeIngredients: { contains: search, mode: 'insensitive' } },
            { therapeuticClass: { contains: search, mode: 'insensitive' } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else {
      records = await prisma.clinicalDrugReference.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 100
      });
    }

    return NextResponse.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error: any) {
    console.error('Error fetching clinical drug references from database:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch clinical references' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brandPattern,
      brandName,
      activeIngredients,
      therapeuticClass,
      indications,
      dosageAndAdmin,
      majorInteractions,
      warningsAndContraindications,
      patientCounselingTip,
      drugBankId,
      drugBankUrl,
      sourceReference
    } = body;

    if (!brandPattern || !brandName || !activeIngredients) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: brandPattern, brandName, activeIngredients' },
        { status: 400 }
      );
    }

    const patternClean = brandPattern.trim().toLowerCase();

    const record = await prisma.clinicalDrugReference.upsert({
      where: { brandPattern: patternClean },
      create: {
        brandPattern: patternClean,
        brandName: brandName.trim(),
        activeIngredients: activeIngredients.trim(),
        therapeuticClass: (therapeuticClass || 'مركب دوائي علاجي').trim(),
        indications: (indications || '').trim(),
        dosageAndAdmin: (dosageAndAdmin || '').trim(),
        majorInteractions: Array.isArray(majorInteractions) ? majorInteractions : [],
        warningsAndContraindications: Array.isArray(warningsAndContraindications) ? warningsAndContraindications : [],
        patientCounselingTip: (patientCounselingTip || '').trim(),
        drugBankId: drugBankId || '',
        drugBankUrl: drugBankUrl || '',
        sourceReference: sourceReference || 'EMC UK • EDA • SFDA • Drugs.com',
        isCustom: true
      },
      update: {
        brandName: brandName.trim(),
        activeIngredients: activeIngredients.trim(),
        therapeuticClass: (therapeuticClass || 'مركب دوائي علاجي').trim(),
        indications: (indications || '').trim(),
        dosageAndAdmin: (dosageAndAdmin || '').trim(),
        majorInteractions: Array.isArray(majorInteractions) ? majorInteractions : [],
        warningsAndContraindications: Array.isArray(warningsAndContraindications) ? warningsAndContraindications : [],
        patientCounselingTip: (patientCounselingTip || '').trim(),
        drugBankId: drugBankId || '',
        drugBankUrl: drugBankUrl || '',
        sourceReference: sourceReference || 'EMC UK • EDA • SFDA • Drugs.com',
        isCustom: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم حفظ الدواء السريري بنجاح في قاعدة البيانات السحابية',
      data: record
    });
  } catch (error: any) {
    console.error('Error saving clinical drug reference:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save clinical reference' },
      { status: 500 }
    );
  }
}
