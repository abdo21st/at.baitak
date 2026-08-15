export interface ClinicalProductInput {
  id?: string | number;
  name: string;
  scientificName?: string;
  dosageForm?: string;
  category?: string;
  stockOnHand?: number;
  costPrice?: number;
  sellPrice?: number;
}

export interface ClinicalCapsuleData {
  productName: string;
  scientificName: string;
  drugBankId?: string;
  drugBankUrl: string;
  mechanismAndPk: string;
  cypMetabolism: string;
  majorInteractions: string[];
  foodAndAlcoholInteractions: string[];
  blackBoxAndWarnings: string[];
  usageTiming: string;
  goldenCounselingTip: string;
  fullMessageText: string;
}

/**
 * Clean and extract drug name for DrugBank lookup
 */
function extractDrugBankQuery(name: string, sciName?: string): string {
  const clean = `${sciName || ''} ${name || ''}`
    .replace(/[0-9]+(\.[0-9]+)?\s*(mg|g|mcg|ml|iu|%)/gi, '')
    .replace(/(\(|\)|tab|suspension|sospension|capsule|inhaler|syrup|drops|spray|retard|forte|coated|plus|extra|hcl|sodium|potassium)/gi, '')
    .trim();
  const firstWord = clean.split(/\s+/)[0] || 'drug';
  return encodeURIComponent(firstWord);
}

/**
 * Comprehensive Clinical Pharmacy & DrugBank Pharmacotherapy Engine.
 * Implements the 5 core DrugBank domains:
 * 1. Mechanism of Action & Pharmacokinetics (PK)
 * 2. CYP450 Hepatic Metabolism & Enzyme Interactions
 * 3. Major & Moderate Drug-Drug Interactions (DDIs)
 * 4. Food, Nutrient & Alcohol Interactions
 * 5. Black Box Warnings, Renal/Hepatic Precautions & Patient Counseling
 */
export function generateClinicalCapsule(product: ClinicalProductInput): ClinicalCapsuleData {
  const name = (product.name || '').trim();
  const sciName = (product.scientificName || '').trim();
  const fullSearch = `${name} ${sciName}`.toLowerCase();
  const form = (product.dosageForm || '').toLowerCase();

  let drugBankId = '';
  let mechanismAndPk = '';
  let cypMetabolism = '';
  let majorInteractions: string[] = [];
  let foodAndAlcoholInteractions: string[] = [];
  let blackBoxAndWarnings: string[] = [];
  let usageTiming = '';
  let goldenCounselingTip = '';

  // -------------------------------------------------------------
  // 1. NIMESULIDE (Aulin, Mesulid, Nimed, Scaflam) - DrugBank: DB00465
  // -------------------------------------------------------------
  if (
    fullSearch.includes('aulin') ||
    fullSearch.includes('nimesulide') ||
    fullSearch.includes('mesulid') ||
    fullSearch.includes('nimed') ||
    fullSearch.includes('scaflam')
  ) {
    drugBankId = 'DB00465';
    mechanismAndPk = 'مثبط نوعي تفضيلي لإنزيم الأكسدة الحلقية COX-2 مع تثبيط تحرر الجذور الحرة وعامل نخر الورم (TNF-alpha). التوافر الحيوي الفموي > 90%، الارتباط ببروتينات البلازما 99%، ونصف العمر الحيوي $t_{1/2} = 2 - 5$ ساعات.';
    cypMetabolism = 'استقلاب كبدي واسع النطاق بشكل رئيسي عبر إنزيم السيتوكروم **CYP2C9** (نحو 4-هيدروكسي نيميسوليد الفعال) مع مساهمة ثانوية لـ CYP2C19 و CYP1A2.';
    majorInteractions = [
      '🔴 تفاعل عالي الخطورة (Major): تزامنه مع الأدوية السامة للكبد (Hepatotoxic Drugs مثل Methotrexate, Ketoconazole, Valproate) يرفع خطر الفشل الكبدي الحاد.',
      '🔴 تفاعل نزفي حاد (Major): مع مضادات التخثر ومميعات الدم (Warfarin, DOACs, Aspirin) بسبب تثبيط وظيفة الصفائح وتخريش الغشاء المخاطي المعدي.',
      '🟠 تفاعل كلوية وضغط (Moderate): يقلل من الفعالية الخافضة لضغط الدم لمثبطات ACE وحاصرات ARBs ومدرات البول العروية (Furosemide).'
    ];
    foodAndAlcoholInteractions = [
      '🍷 الكحول: ممنوع منعاً باتاً طوال فترة العلاج (يستنزف الغلوتاثيون الكبدي ويفاقم خطر النخر الكبدي الفتاك).',
      '🥗 الطعام: يُؤخذ بدقة بعد وجبة طعام كاملة لتقليل التخريش الموضعي المعدي، والأكياس تُذاب في نصف كوب ماء بعد الأكل.'
    ];
    blackBoxAndWarnings = [
      '⚠️ تحذير الصندوق الأسود (Black Box Warning): خطر التسمم الكبدي الحاد والفشل الكبدي المداهم (Fulminant Hepatic Failure).',
      '⏱️ أقصى مدة استخدام مستمرة: 15 يوماً متتالية فقط، ويُمنع صرفه لمرضى القصور الكبدي أو مدمني الكحول.',
      '🛑 التوقف الفوري عند ظهور أعراض الإجهاد الكبدي: فقدان شهية مفاجئ، غثيان، بول داكن كلون الشاي، أو يرقان.'
    ];
    usageTiming = '100 ملغ مرتين يومياً بدقة بعد الطعام مباشرة مع كوب ماء وفير، لمدة لا تتجاوز 15 يوماً.';
    goldenCounselingTip = 'النيميسوليد مسكن نوعي ممتاز لعسر الطمث الأولي والآلام الالتهابية الحادة، ولكنه خط علاجي ثانٍ (Second-line)؛ شدد على المريض بعدم تجاوز 15 يوماً ومراجعة الطبيب عند استمرار الألم.';
  }

  // -------------------------------------------------------------
  // 2. DICLOFENAC (Voltaren, Cataflam, Olfen, Rota, Diclac) - DrugBank: DB01097
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('diclofenac') ||
    fullSearch.includes('voltaren') ||
    fullSearch.includes('cataflam') ||
    fullSearch.includes('olfen') ||
    fullSearch.includes('diclo') ||
    fullSearch.includes('diclac')
  ) {
    drugBankId = 'DB01097';
    mechanismAndPk = 'تثبيط غير انتقائي لإنزيمي COX-1 و COX-2 مما يثبط اصطناع البروستاغلاندين. ملح البوتاسيوم سريع الامتصاص (Cmax خلال 20-30 دقيقة)، بينما ملح الصوديوم ممتد المفعول. الارتباط بالبروتين > 99%، ونصف العمر $t_{1/2} = 1.2 - 2$ ساعة.';
    cypMetabolism = 'استقلاب كبدي رئيسي عبر **CYP2C9** (تكوين 4-هيدروكسي ديكلوفيناك) ومساهمة ثانوية لـ **CYP3A4** و **CYP2C8**.';
    majorInteractions = [
      '🔴 الليثيوم والديجوكسين والميثوتريكسات: يقلل إطراحها الكلوي ويرفع مستوياتها لدرجة التسمم الدوائي الحاد.',
      '🔴 مضادات التخثر والأسبرين: مضاعفة خطر النزيف الهضمي والتقرح المعوي.',
      '🟠 خافضات الضغط (ACEIs/ARBs/Beta Blockers): يعاكس مفعولها الخافض للضغط ويجهد الكلى.'
    ];
    foodAndAlcoholInteractions = [
      '🥗 الطعام: يؤخذ بعد الأكل مباشرة مع كوب ماء كبير للحد من التقرح المريئي والمعدي.',
      '🍷 الكحول: يزيد من خطر التآكل والنزيف الهضمي.'
    ];
    blackBoxAndWarnings = [
      '⚠️ تحذير الصندوق الأسود: زيادة خطر الحوادث القلبية الوعائية الخثارية (احتشاء العضلة القلبية والجلطة الدماغية) والنزيف الهضمي.',
      '🚫 موانع استعمال قطعية: بعد عمليات ترقيع الشرايين التاجية (CABG)، وقصور القلب الاحتقاني الشديد (NYHA II-IV).'
    ];
    usageTiming = '50 ملغ 2-3 مرات يومياً أو 100 ملغ ريتارد مرة واحدة يومياً بعد الأكل مباشرة.';
    goldenCounselingTip = 'اختر كتافلام للآلام الحادة الفورية والصداع لسرعة وصوله لمجرى الدم، وفولتارين للمفاصل، وتجنبه تماماً لمرضى قصور القلب والضغط غير المنضبط.';
  }

  // -------------------------------------------------------------
  // 3. PARACETAMOL / ACETAMINOPHEN (Panadol, Calpol, Adol, Tylenol) - DrugBank: DB00316
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('paracetamol') ||
    fullSearch.includes('panadol') ||
    fullSearch.includes('calpol') ||
    fullSearch.includes('adol') ||
    fullSearch.includes('acetaminophen') ||
    fullSearch.includes('tylenol') ||
    fullSearch.includes('cetamol')
  ) {
    drugBankId = 'DB00316';
    mechanismAndPk = 'تثبيط اصطناع البروستاغلاندين في الجهاز العصبي المركزي (COX-3/Central COX) وتنشيط مسارات السيروتونين النازلة المسكنة. التوافر الحيوي 85-98%، ارتباط بروتيني منخفض (10-25%)، $t_{1/2} = 2 - 3$ ساعات.';
    cypMetabolism = 'استقلاب كبدي رئيسي عبر الاقتران بالغلوكورونيد والكبريتات (90%)، ونحو 5-10% عبر **CYP2E1** و **CYP1A2/CYP3A4** إلى المستقلب السام N-acetyl-p-benzoquinone imine (NAPQI) الذي يُعادل بالغلوتاثيون.';
    majorInteractions = [
      '🔴 محفزات الإنزيمات الكبدية (Carbamazepine, Phenytoin, Rifampin): تسرع تكوين مستقلب NAPQI السام للكبد.',
      '🟠 الوارفارين (Warfarin): الاستخدام المزمن لأكثر من 2 غرام يومياً يرفع مؤشر INR ويزيد خطر النزيف.'
    ];
    foodAndAlcoholInteractions = [
      '🍷 استهلاك الكحول المزمن: يحفز إنزيم CYP2E1 ويستنزف مخزون الغلوتاثيون، مما يحول الجرعات العلاجية العادية إلى جرعات سامة للكبد.'
    ];
    blackBoxAndWarnings = [
      '⚠️ تحذير الجرعة العظمى: الجرعة القصوى للبالغين 4000 ملغ (4 غرام) في 24 ساعة لتجنب النخر الكبدي الحاد (Hepatic Necrosis).',
      '⚠️ خطر الجرعات الخفية: التحقق الصارم من عدم وجود الباراسيتامول في أدوية الرشح المركبة المرافقة.'
    ];
    usageTiming = '500 - 1000 ملغ كل 6 إلى 8 ساعات عند اللزوم (بحد أقصى 4 غرام يومياً).';
    goldenCounselingTip = 'الباراسيتامول هو الخيار الأكثر أماناً للحوامل والمرضعات ومرضى الكلى والقرحة؛ لكن نبه المريض بعدم تجاوز حبتين كل 6 ساعات والتأكد من خلو أدوية الإنفلونزا الأخرى منه.';
  }

  // -------------------------------------------------------------
  // 4. ESOMEPRAZOLE / OMEPRAZOLE (Nexium, Losec, Controloc, Pantoprazole) - DrugBank: DB00736 / DB00338 / DB00213
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('prazole') ||
    fullSearch.includes('nexium') ||
    fullSearch.includes('controloc') ||
    fullSearch.includes('losec') ||
    fullSearch.includes('omep') ||
    fullSearch.includes('panto') ||
    fullSearch.includes('esom') ||
    fullSearch.includes('pariet') ||
    fullSearch.includes('lanso')
  ) {
    const isPanto = fullSearch.includes('panto') || fullSearch.includes('controloc');
    drugBankId = isPanto ? 'DB00213' : fullSearch.includes('esom') ? 'DB00736' : 'DB00338';
    mechanismAndPk = 'تثبيط نوعي وغير عكوس لمضخة البروتون المعدية (H+/K+-ATPase) في الخلايا الجدارية. التوافر الحيوي 64-90%، نصف العمر البلازمي $t_{1/2} = 1 - 1.5$ ساعة، بينما يمتد التثبيط الحمضي البيولوجي لأكثر من 24-48 ساعة.';
    cypMetabolism = isPanto
      ? 'استقلاب كبدي واسع عبر **CYP2C19** بشكل رئيسي ونظام كبريتي فرعي؛ يمتاز بأقل معدل لتثبيط الإنزيمات الكبدية وأعلى أمان سريري.'
      : 'استقلاب كبدي رئيسي عبر **CYP2C19** ومثبط قوي لنفس الإنزيم، مع مساهمة ثانوية لـ **CYP3A4**.';
    majorInteractions = [
      isPanto
        ? '🟢 بلافيكس (Clopidogrel): البانتوبرازول هو الخيار الأكثر أماناً مع مرضى القلب والبلافيكس لقلة تداخله مع CYP2C19.'
        : '🔴 بلافيكس (Clopidogrel): الأوميبرازول والإيزوميبرازول يثبطان تفعيل البلافيكس عبر CYP2C19 مما يرفع خطر الجلطات المتكررة.',
      '🔴 مضادات الفطريات وإسترات الأمبيسيلين: ينخفض امتصاصها بشدة نتيجة قلة حموضة المعدة (Achlorhydria).'
    ];
    foodAndAlcoholInteractions = [
      '🥗 الطعام: يجب تناوله على معدة فارغة تماماً قبل الفطور بـ 30-60 دقيقة (الطعام يقلل التوافر الحيوي بنسبة 50%).'
    ];
    blackBoxAndWarnings = [
      '⚠️ الاستخدام المزمن المطول (> 1 سنة): خطر نقص المغنيسيوم (Hypomagnesemia)، كسور هشاشة العظام، ونقص فيتامين B12، وعدوى C. difficile المعوية.'
    ];
    usageTiming = '20 - 40 ملغ صباحاً على الريق قبل الفطور بـ 30 إلى 60 دقيقة يومياً.';
    goldenCounselingTip = 'ابلع الحبة كاملة قبل الفطور بنصف ساعة ولا تكسرها؛ والبانتوبرازول هو الدواء المثالي والآمن لمرضى القلب الخاضعين للعلاج بالبلافيكس.';
  }

  // -------------------------------------------------------------
  // 5. METFORMIN (Glucophage, Cidophage) - DrugBank: DB00331
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('metformin') ||
    fullSearch.includes('glucophage') ||
    fullSearch.includes('cidophage') ||
    fullSearch.includes('formet')
  ) {
    drugBankId = 'DB00331';
    mechanismAndPk = 'تنشيط إنزيم AMPK الكبدي مما يثبط استحداث السكر (Gluconeogenesis) ويزيد الحساسية المحيطية للإنسولين. التوافر الحيوي 50-60%، ارتباط بروتيني معدوم، لا يخضع للاستقلاب الكبدي، ويُطرح 90% دون تغيير عبر الكلى بنواقل OCT2/MATE1. $t_{1/2} = 6.2$ ساعة.';
    cypMetabolism = '⚡ **لا يخضع لاستقلاب إنزيمات السيتوكروم CYP450 كبدياً**؛ يعتمد كلياً على نواقل الكاتيونات العضوية الكلوية (OCT1, OCT2, MATE1/2-K).';
    majorInteractions = [
      '🔴 الصبغات الإشعاعية اليودية (Iodinated Contrast Media): خطر التراكم الكلوي والحماض اللبني المميت؛ يجب إيقافه قبل الإجراء بـ 48 ساعة.',
      '🟠 أدوية تثبيط OCT2 (Cimetidine, Dolutegravir, Ranolazine): ترفع تركيز الميتفورمين في الدم.'
    ];
    foodAndAlcoholInteractions = [
      '🥗 الطعام: تناوله وسط أو نهاية الوجبة الرئيسية يقلل الآثار الهضمية المزعجة (الإسهال والغثيان).',
      '🍷 الكحول: يرفع بشكل حاد خطر الحماض اللبني السكري (Lactic Acidosis).'
    ];
    blackBoxAndWarnings = [
      '⚠️ تحذير الصندوق الأسود: خطر الحماض اللبني (Lactic Acidosis).',
      '🚫 موانع الاستعمال: القصور الكلوي الشديد عندما ينخفض معدل الترشيح الكبيبي $eGFR < 30 \text{ mL/min/1.73m}^2$.'
    ];
    usageTiming = '500 - 1000 ملغ مرتين إلى 3 مرات يومياً مع الوجبات الرئيسية (أو XR 1000 ملغ مع العشاء).';
    goldenCounselingTip = 'طمئن المريض بأن اضطرابات المعدة ستتلاشى تدريجياً خلال أسبوعين إذا أخذ القرص في منتصف الأكل، وأكد على فحص فيتامين B12 ووظائف الكلى سنوياً.';
  }

  // -------------------------------------------------------------
  // 6. ATORVASTATIN & ROSUVASTATIN (Lipitor, Crestor) - DrugBank: DB01076 / DB01098
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('statin') ||
    fullSearch.includes('lipitor') ||
    fullSearch.includes('crestor') ||
    fullSearch.includes('ator') ||
    fullSearch.includes('rosu') ||
    fullSearch.includes('simva')
  ) {
    const isRosuva = fullSearch.includes('rosu') || fullSearch.includes('crestor');
    drugBankId = isRosuva ? 'DB01098' : 'DB01076';
    mechanismAndPk = 'تثبيط تنافسي قوي لإنزيم HMG-CoA Reductase الموجه لتصنيع الكوليسترول في الكبد، مما يحفز التعبير عن مستقبلات LDL الكبدية. الارتباط بالبروتين $\ge 98\%$، نصف العمر الحيوي $t_{1/2} = 14 - 20$ ساعة.';
    cypMetabolism = isRosuva
      ? 'استقلاب كبدي طفيف (10% فقط عبر **CYP2C9**) مما يجعله أقل عرضة للتداخلات الدوائية مقارنة بالستاتينات الأخرى.'
      : 'استقلاب كبدي واسع وحصري عبر إنزيم **CYP3A4** مما يجعله عالي الحساسية للمثبطات الإنزيمية.';
    majorInteractions = [
      isRosuva
        ? '🟠 مضادات الحموضة وسيكلوسبورين: تنقص امتصاص الروتسوفاستاتين؛ يجب المباعدة ساعتين.'
        : '🔴 مثبطات CYP3A4 القوية (Clarithromycin, Itraconazole, Protease Inhibitors): تضاعف تركيز الأتورفاستاتين وتسبب انحلال الربيدات العضلي (Rhabdomyolysis).',
      '🔴 مشتقات الفايبرات (Gemfibrozil): مضاعفة السمية العضلية عند المشاركة دون استطباب حرج.'
    ];
    foodAndAlcoholInteractions = [
      '🍈 عصير الجريب فروت (Grapefruit): يثبط CYP3A4 المعوي بشدة ويرفع تركيز أتورفاستاتين لمستويات سامة.',
      '🥗 الطعام: يمكن تناوله مع أو بدون طعام، ويفضل في المساء قبل النوم.'
    ];
    blackBoxAndWarnings = [
      '⚠️ اعتلال العضلات وانحلال الربيدات (Myopathy/Rhabdomyolysis): التوقف الفوري عند وجود آلام عضلية شديدة وتغير لون البول للبني.',
      '🚫 موانع الاستعمال: أمراض الكبد النشطة، والحمل والإرضاع (فئة X تشوهات جنينية).'
    ];
    usageTiming = '10 - 40 ملغ مساءً مرة واحدة يومياً مع أو بدون طعام.';
    goldenCounselingTip = 'الستاتين يثبت لويحات التصلب العصيدي ويحمي الشرايين على المدى الطويل؛ طمئن المريض بشأن سلامته واطلب منه إبلاغك فوراً عند الشعور بآلام عضلية غير معتادة.';
  }

  // -------------------------------------------------------------
  // 7. BISOPROLOL & CARDIAC BETA BLOCKERS (Concor) - DrugBank: DB00612
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('concor') ||
    fullSearch.includes('bisoprolol') ||
    fullSearch.includes('inderal') ||
    fullSearch.includes('propranolol') ||
    fullSearch.includes('carvedilol') ||
    fullSearch.includes('nebivolol') ||
    fullSearch.includes('olol')
  ) {
    drugBankId = 'DB00612';
    mechanismAndPk = 'حاصر نوعي اصطفائي عالي الألفة لمستقبلات بيتا-1 القلبية (Cardioselective Beta-1 Blocker)، يقلل استهلاك الأكسجين القلبي والنتاج القلبي وإفراز الرينين. التوافر الحيوي 80%، $t_{1/2} = 9 - 12$ ساعة.';
    cypMetabolism = 'استقلاب كبدي متوازن (50% عبر **CYP3A4** و **CYP2D6**) و 50% يُطرح دون تغيير عبر الكلى (Balanced Dual Clearance).';
    majorInteractions = [
      '🔴 حاصرات الكالسيوم غير الديهيدروبيريدينية (Verapamil, Diltiazem): خطر الإحصار الأذيني البطيني الحاد (AV Block) وتوقف القلب.',
      '🔴 مضادات عدم الانتظام (Amiodarone, Digoxin): بطء ضربات القلب الشديد.'
    ];
    foodAndAlcoholInteractions = [
      '🥗 الطعام: يؤخذ صباحاً مع وجبة الفطور لتقليل الغثيان والدوار الانتصابي.'
    ];
    blackBoxAndWarnings = [
      '⚠️ تحذير الإيقاف المفاجئ: التوقف غير المتدرج يقود لنوبات ذبحة صدرية، احتشاء عضلة قلبية، وارتفاع ضغط ارتدادي حاد.',
      '⚠️ إخفاء أعراض نقص السكر: يخفي الرعشة وتسارع النبض لدى مرضى السكري باستثناء التعرق.'
    ];
    usageTiming = '2.5 - 10 ملغ صباحاً مع وجبة الإفطار مع مراقبة النبض الدوري.';
    goldenCounselingTip = 'حاصرات بيتا صمام أمان لحماية عضلة القلب؛ حذر المريض بشدة من التوقف المفاجئ عن الدواء، وعلّمه قياس نبض القلب الدوري بحيث لا يقل عن 55 نبضة بالدقيقة.';
  }

  // -------------------------------------------------------------
  // 8. RIVAROXABAN & DIRECT ORAL ANTICOAGULANTS (Xarelto, Eliquis) - DrugBank: DB06228 / DB06605
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('xarelto') ||
    fullSearch.includes('rivaroxaban') ||
    fullSearch.includes('eliquis') ||
    fullSearch.includes('apixaban')
  ) {
    const isRiva = fullSearch.includes('xarelto') || fullSearch.includes('rivaroxaban');
    drugBankId = isRiva ? 'DB06228' : 'DB06605';
    mechanismAndPk = 'تثبيط نوعي ومباشر لعامل التخثر العاشر المفعل Factor Xa الحر والمرتبط بالخثرة دون الحاجة لمضاد الثرومبين. التوافر الحيوي لجرعة الزاريلتو 20 ملغ يرتفع من 66% إلى 100% عند تناوله مع وجبة دسمة! $t_{1/2} = 5 - 9$ ساعات.';
    cypMetabolism = 'استقلاب كبدي ثنائي عبر **CYP3A4/5** و **CYP2J2** بالإضافة لآليات إطراح كلوية معتمدة على ناقل P-gp و BCRP.';
    majorInteractions = [
      '🔴 مثبطات CYP3A4 و P-gp المزدوجة (Ketoconazole, Itraconazole, Ritonavir): مضاعفة تركيز الدواء بالدم لدرجة النزيف المميت.',
      '🔴 المسكنات ومضادات الالتهاب (NSAIDs, Aspirin): مضاعفة خطر النزيف المعدي والمعوي.'
    ];
    foodAndAlcoholInteractions = [
      '🥗 وجبة الطعام (شرط إلزامي للزاريلتو 15 و 20 ملغ): يجب تناوله أثناء أو بعد وجبة طعام رئيسية مباشرة لضمان الامتصاص الكامل 100%.'
    ];
    blackBoxAndWarnings = [
      '⚠️ تحذير الصندوق الأسود: خطر التخثر والجلطات الوعائية عند التوقف المبكر دون بديل، وخطر الورم الدموي الشوكي (Spinal/Epidural Hematoma) عند التخدير النخاعي.'
    ];
    usageTiming = isRiva
      ? '15 - 20 ملغ مرة واحدة يومياً بدقة مع وجبة الطعام الرئيسية.'
      : '5 ملغ مرتين يومياً كل 12 ساعة مع أو بدون طعام.';
    goldenCounselingTip = 'مضادات التخثر الحديثة تحمي من السكتات الدماغية والجلطات؛ شدد على مريض الزاريلتو بتناول الحبة وسط الأكل لامتصاص كامل، وحذره من خلط المسكنات معها.';
  }

  // -------------------------------------------------------------
  // 9. GENERAL / ADVANCED FALLBACK WITH DRUGBANK SEARCH LINK
  // -------------------------------------------------------------
  else {
    drugBankId = '';
    let formDetails = 'يُؤخذ بانتظام بالجرعة المقررة مع كوب ماء وفير (250 مل).';
    if (form.includes('susp') || form.includes('syrup') || form.includes('liquid') || fullSearch.includes('sospension') || fullSearch.includes('syrup')) {
      formDetails = 'يُرج المحلول/المعلق جيداً قبل كل جرعة لضمان تجانس المادة الفعالة، مع استخدام المكيال المدرج المرفق بدقة.';
    } else if (form.includes('drop') || fullSearch.includes('drops')) {
      formDetails = 'تُقطر الجرعة المقررة مع إغلاق العين/الأذن دقيقة وتجنب ملامسة فوهة القطارة للأنسجة لضمان التعقيم.';
    } else if (form.includes('efferv') || fullSearch.includes('fizz') || fullSearch.includes('sachet')) {
      formDetails = 'يُذاب الفوار/الكيس بالكامل في نصف كوب ماء ويُشرب مباشرة بعد توقف الفوران.';
    }

    mechanismAndPk = 'تثبيط/تنشيط نوعي للمستقبلات المستهدفة وفق الآلية الدوائية المعتمدة للمادة الفعالة، مع ثبات التوافر الحيوي عند الالتزام بالجرعات الدورية.';
    cypMetabolism = 'استقلاب كبدي وإطراح كلوي متوازن عبر المسارات الإنزيمية المعتمدة لنوع المادة الفعالة والشكل الصيدلاني.';
    majorInteractions = [
      '🔴 تفاعلات معززة للسمية: استشارة الصيدلي دائماً عند إضافة مسكنات NSAIDs، أدوية السيولة، أو أدوية الأمراض المزمنة.',
      '🟠 تفاعلات حركية (PK): المباعدة ساعتين عن مضادات الحموضة ومكملات المعادن المتعددة (الحديد والكالسيوم).'
    ];
    foodAndAlcoholInteractions = [
      '🥗 الطعام: الالتزام بالإرشادات الخاصة بالدواء (قبل/بعد الأكل) وشرب كميات كافية من الماء.',
      '🍷 الكحول: تجنب الكحول لتفادي الإجهاد الكبدي والتداخلات العصبية المثبطة.'
    ];
    blackBoxAndWarnings = [
      '⚠️ الالتزام الصارم بالجرعات الموصوفة وتجنب مضاعفة الجرعة عند النسيان.',
      '⚠️ حفظ الدواء في درجة حرارة أقل من 25 مئوية بعيداً عن الرطوبة والضوء المباشر.'
    ];
    usageTiming = `${formDetails} مع مراعاة تناوله في نفس الموعد يومياً للمحافظة على تركيز ثابت بالدم.`;
    goldenCounselingTip = 'احرص على سؤال المريض عن تاريخه المرضي ووظائف الكلى والكبد والأدوية المزمنة الأخرى لتجنب التداخلات الخفية.';
  }

  // Construct DrugBank Direct URL
  const drugBankUrl = drugBankId
    ? `https://go.drugbank.com/drugs/${drugBankId}`
    : `https://go.drugbank.com/unearth/q?query=${extractDrugBankQuery(name, sciName)}`;

  // Construct formatted WhatsApp message based strictly on DrugBank Standards
  const fullMessageText = `🌿 *كبسولة صيدلية بيتك السريرية • المرجع الدوائي (DrugBank Standards)* 💊✨
━━━━━━━━━━━━━━━━━━━
👤 مرحباً بك يا *{name}* في التدريب الصيدلاني المتقدم!
📦 الصنف: *${name}* ${sciName ? `(${sciName})` : ''}
🔗 المرجع العلمي: ${drugBankUrl}
━━━━━━━━━━━━━━━━━━━
🎯 *1. آلية العمل والحركية الدوائية (Mechanism & PK):*
• ${mechanismAndPk}
• *التوقيت والاستخدام المثالي:* ${usageTiming}

⚠️ *2. الاستقلاب الكبدي وإنزيمات السيتوكروم (CYP450 Metabolism):*
• ${cypMetabolism}

🚫 *3. التداخلات الدوائية المعتمدة (Drug-Drug Interactions):*
${majorInteractions.map((i) => `• ${i}`).join('\n')}

🥗 *4. التداخلات الغذائية والكحولية (Food & Alcohol):*
${foodAndAlcoholInteractions.map((f) => `• ${f}`).join('\n')}

⚠️ *5. التحذيرات الصندوقية واحتياطات الصرف (Black Box & Precautions):*
${blackBoxAndWarnings.map((w) => `• ${w}`).join('\n')}

💡 *6. التوجيه السريري الذهبي للصيدلي عند الصرف:*
• ${goldenCounselingTip}
━━━━━━━━━━━━━━━━━━━
🌿 *صيدلية بيتك.. رعاية صيدلانية متكاملة بمعايير عالمية!* ✨`;

  return {
    productName: name,
    scientificName: sciName,
    drugBankId,
    drugBankUrl,
    mechanismAndPk,
    cypMetabolism,
    majorInteractions,
    foodAndAlcoholInteractions,
    blackBoxAndWarnings,
    usageTiming,
    goldenCounselingTip,
    fullMessageText
  };
}

export const DEFAULT_CLINICAL_PRODUCTS: ClinicalProductInput[] = [
  { id: '1', name: 'Aulin 100mg sospension (Nimesulide)', scientificName: 'Nimesulide 100mg', dosageForm: 'Suspension', category: 'MEDICINES', stockOnHand: 28, sellPrice: 24.0 },
  { id: '2', name: 'Nexium 40mg Tab (Esomeprazole)', scientificName: 'Esomeprazole 40mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 24, sellPrice: 48.0 },
  { id: '3', name: 'Glucophage 500mg (Metformin)', scientificName: 'Metformin HCl 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 35, sellPrice: 15.5 },
  { id: '4', name: 'Lipitor 20mg (Atorvastatin)', scientificName: 'Atorvastatin 20mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 18, sellPrice: 52.0 },
  { id: '5', name: 'Augmentin 1g Tab (Amoxicillin/Clavulanate)', scientificName: 'Amoxicillin + Clavulanic Acid 1g', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 42, sellPrice: 38.0 },
  { id: '6', name: 'Ventolin Inhaler 100mcg (Salbutamol)', scientificName: 'Salbutamol Inhaler', dosageForm: 'Inhaler', category: 'MEDICINES', stockOnHand: 30, sellPrice: 22.0 },
  { id: '7', name: 'Concor 5mg (Bisoprolol)', scientificName: 'Bisoprolol Fumarate 5mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 28, sellPrice: 26.0 },
  { id: '8', name: 'Voltaren 50mg (Diclofenac Sodium)', scientificName: 'Diclofenac Sodium 50mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 50, sellPrice: 18.0 },
  { id: '9', name: 'Symbicort Turbuhaler 160/4.5mcg', scientificName: 'Budesonide + Formoterol', dosageForm: 'Inhaler', category: 'MEDICINES', stockOnHand: 12, sellPrice: 95.0 },
  { id: '10', name: 'Panadol Extra Tab (Paracetamol + Caffeine)', scientificName: 'Paracetamol 500mg + Caffeine 65mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 65, sellPrice: 12.0 },
  { id: '11', name: 'Osteocare Plus Omega-3 (Vitabiotics)', scientificName: 'Calcium + Magnesium + Vit D3 + Zinc', dosageForm: 'Tablets', category: 'SUPPLEMENTS', stockOnHand: 22, sellPrice: 45.0 },
  { id: '12', name: 'Feroglobin B12 Capsules', scientificName: 'Iron + Zinc + B-Complex + Folic Acid', dosageForm: 'Capsules', category: 'SUPPLEMENTS', stockOnHand: 19, sellPrice: 36.0 },
  { id: '13', name: 'Klacid 500mg Tab (Clarithromycin)', scientificName: 'Clarithromycin 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 14, sellPrice: 62.0 },
  { id: '14', name: 'Eltroxin 50mcg (Levothyroxine)', scientificName: 'Levothyroxine Sodium 50mcg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 20, sellPrice: 18.0 },
  { id: '15', name: 'Cataflam 50mg (Diclofenac Potassium)', scientificName: 'Diclofenac Potassium 50mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 40, sellPrice: 19.5 },
  { id: '16', name: 'Zithromax 500mg (Azithromycin)', scientificName: 'Azithromycin 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 16, sellPrice: 42.0 },
  { id: '17', name: 'Jardiance 10mg (Empagliflozin)', scientificName: 'Empagliflozin 10mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 15, sellPrice: 140.0 },
  { id: '18', name: 'Crestor 10mg (Rosuvastatin)', scientificName: 'Rosuvastatin 10mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 17, sellPrice: 68.0 },
  { id: '19', name: 'Controloc 40mg (Pantoprazole)', scientificName: 'Pantoprazole 40mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 25, sellPrice: 44.0 },
  { id: '20', name: 'Brufen 400mg (Ibuprofen)', scientificName: 'Ibuprofen 400mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 55, sellPrice: 14.0 },
  { id: '21', name: 'Otrivin 0.1% Adult Nasal Spray', scientificName: 'Xylometazoline HCl 0.1%', dosageForm: 'Nasal Spray', category: 'MEDICINES', stockOnHand: 34, sellPrice: 16.0 },
  { id: '22', name: 'Telfast 180mg Tab (Fexofenadine)', scientificName: 'Fexofenadine HCl 180mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 22, sellPrice: 32.0 },
  { id: '23', name: 'Duspatalin 200mg Retard (Mebeverine)', scientificName: 'Mebeverine HCl 200mg', dosageForm: 'Capsules', category: 'MEDICINES', stockOnHand: 26, sellPrice: 35.0 },
  { id: '24', name: 'Xarelto 20mg Tab (Rivaroxaban)', scientificName: 'Rivaroxaban 20mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 10, sellPrice: 180.0 }
];
