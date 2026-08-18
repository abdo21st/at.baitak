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
  indications: string;
  dosageAndAdmin: string;
  majorInteractions: string[];
  warningsAndContraindications: string[];
  patientCounselingTip: string;
  fullMessageText: string;
  // Legacy fields for backwards compatibility
  mechanismAndPk?: string;
  cypMetabolism?: string;
  usageTiming?: string;
  goldenCounselingTip?: string;
  foodAndAlcoholInteractions?: string[];
  blackBoxAndWarnings?: string[];
}

/**
 * دالة مساعدة لتنظيف اسم الدواء والبحث في المراجع العالمية
 */
function cleanDrugQuery(name: string, sciName?: string): string {
  const clean = `${sciName || ''} ${name || ''}`
    .replace(/[0-9]+(\.[0-9]+)?\s*(mg|g|mcg|ml|iu|%)/gi, '')
    .replace(/(\(|\)|tab|tablets|suspension|sospension|capsule|inhaler|syrup|drops|spray|retard|forte|coated|plus|extra|hcl|sodium|potassium)/gi, '')
    .trim();
  const firstWord = clean.split(/\s+/)[0] || 'drug';
  return encodeURIComponent(firstWord);
}

/**
 * المحرك السريري الذكي لصيدلية بيتك (Clinical Pharmacotherapy Engine)
 * مصمم لتزويد الصيدلي وموظف الصرف بالمعلومات الأساسية السريعة والموجزة:
 * 1. دواعي الاستعمال (Indications)
 * 2. طريقة الوصف والجرعة (Dosage & Administration)
 * 3. أهم التداخلات الدوائية (Major Drug Interactions)
 * 4. موانع الاستعمال والتحذيرات (Contraindications & Warnings)
 * 5. نصيحة الصرف السريرية للمريض (Patient Counseling Tip)
 */
export function generateClinicalCapsule(product: ClinicalProductInput): ClinicalCapsuleData {
  const name = (product.name || '').trim();
  const sciName = (product.scientificName || '').trim();
  const fullSearch = `${name} ${sciName}`.toLowerCase();
  const form = (product.dosageForm || '').toLowerCase();

  let drugBankId = '';
  let activeIngredientsEn = sciName || 'Active Pharmaceutical Ingredient';
  let therapeuticClass = 'علاج دوائي (Pharmacotherapy)';
  let indications = '';
  let dosageAndAdmin = '';
  let majorInteractions: string[] = [];
  let warningsAndContraindications: string[] = [];
  let patientCounselingTip = '';

  // -------------------------------------------------------------
  // 1. COLD & FLU COMBINATIONS: 123, Congestal, Comtrex, Flutab, Panadol Cold & Flu
  // -------------------------------------------------------------
  if (
    fullSearch.includes('123') ||
    fullSearch.includes('1 2 3') ||
    fullSearch.includes('one two three') ||
    fullSearch.includes('congestal') ||
    fullSearch.includes('flutab') ||
    fullSearch.includes('comtrex') ||
    fullSearch.includes('cold & flu') ||
    fullSearch.includes('cold and flu') ||
    fullSearch.includes('decancit') ||
    fullSearch.includes('c-cold')
  ) {
    drugBankId = 'DB00316';
    activeIngredientsEn = 'Paracetamol + Pseudoephedrine HCl + Chlorpheniramine Maleate';
    therapeuticClass = 'علاج نزلات البرد والرشح (Analgesic + Decongestant + Antihistamine)';
    indications = 'تخفيف أعراض نزلات البرد والإنفلونزا الحادة: انسداد واحتقان الأنف، العطاس وسيلان الأنف، الصداع، آلام الجسم والحرارة.';
    dosageAndAdmin = '• البالغين والأطفال فوق 12 سنة: قرص واحد (أو 10 مل شراب) كل 6-8 ساعات بعد الأكل (أقصى حد 3-4 مرات يومياً).\n• الأطفال (6 - 12 سنة): 5 مل شراب 3 مرات يومياً. لا يُعطى للأطفال دون 6 سنوات إلا بإشراف طبي.';
    majorInteractions = [
      '🔴 أدوية الضغط (Anti-hypertensives): مادة Pseudoephedrine تسبب انقباض الأوعية وترفع ضغط الدم وتعاكس أدوية الضغط.',
      '🔴 أدوية الباراسيتامول الأخرى (Panadol / Adol): تجنب الجمع لمنع الجرعة الزائدة وتسمم الكبد.',
      '🔴 مثبطات (MAO Inhibitors): ممنوع الجمع التام (خطر نوبة ارتفاع ضغط دم مميتة Hypertensive Crisis).'
    ];
    warningsAndContraindications = [
      '🚫 ممنوع لمرضى ارتفاع ضغط الدم الشديد غير المنضبط، وأمراض الشرايين التاجية، وتضخم البروستاتا، والمياه الزرقاء (Glaucoma).',
      '⚠️ يسبب النعاس وضعف التركيز (Drowsiness)؛ تجنب القيادة أو تشغيل الآلات بعد تناوله.',
      '🤰 الحمل والرضاعة: غير مفضل إلا عند الضرورة القصوى وبعد استشارة الطبيب.'
    ];
    patientCounselingTip = 'تناول الدواء بعد الأكل مع كوب ماء، وتجنب قيادة السيارة لكونه يسبب النعاس، وتأكد من عدم تناول أي بنادول أو خافض حرارة آخر معه.';
  }

  // -------------------------------------------------------------
  // 2. PARACETAMOL / ACETAMINOPHEN (Panadol, Adol, Calpol, Cetal)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('paracetamol') ||
    fullSearch.includes('panadol') ||
    fullSearch.includes('adol') ||
    fullSearch.includes('acetaminophen') ||
    fullSearch.includes('calpol') ||
    fullSearch.includes('cetal')
  ) {
    drugBankId = 'DB00316';
    activeIngredientsEn = 'Paracetamol (Acetaminophen)';
    therapeuticClass = 'مسكن وخافض للحرارة (Analgesic & Antipyretic)';
    indications = 'تسكين الآلام الخفيفة إلى المتوسطة (الصداع، ألم الأسنان، آلام العضلات والمفاصل) وخفض درجات الحرارة المرتفعة والحمى.';
    dosageAndAdmin = '• البالغين: 500 ملغ إلى 1000 ملغ (قرص إلى قرصين) كل 6-8 ساعات عند اللزوم (أقصى جرعة يومية 4000 ملغ / 4 غرام).\n• الأطفال: 10 - 15 ملغ/كغ كل 6 ساعات حسب وزن الطفل.';
    majorInteractions = [
      '🔴 الكحول المزمن ومحفزات الإنزيمات (Carbamazepine, Phenytoin): تزيد إنتاج المستقلب السام للكبد (NAPQI).',
      '🟠 دواء الوارفارين (Warfarin): الجرعات العالية المنتظمة (> 2 غرام يومياً) ترفع مؤشر سيولة الدم (INR).'
    ];
    warningsAndContraindications = [
      '⚠️ الالتزام الصارم بالجرعة القصوى (4 غرام يومياً) لتفادي الفشل الكبدي الحاد (Hepatic Toxicity).',
      '✅ الخيار الأكثر أماناً للحوامل والمرضعات ومرضى القرحة المعدية ومرضى الكلى.'
    ];
    patientCounselingTip = 'يُؤخذ مع أو بدون طعام، مع مراعاة فاصل 4 إلى 6 ساعات بين الجرعات، وتجنب تناوله بالتزامن مع أدوية نزلات البرد التي تحتوي على الباراسيتامول.';
  }

  // -------------------------------------------------------------
  // 3. NSAIDs: NIMESULIDE, DICLOFENAC, IBUPROFEN, KETOPROFEN
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('nimesulide') ||
    fullSearch.includes('aulin') ||
    fullSearch.includes('mesulid') ||
    fullSearch.includes('diclofenac') ||
    fullSearch.includes('voltaren') ||
    fullSearch.includes('cataflam') ||
    fullSearch.includes('brufen') ||
    fullSearch.includes('ibuprofen') ||
    fullSearch.includes('ketofan') ||
    fullSearch.includes('profid') ||
    fullSearch.includes('meloxicam')
  ) {
    const isNimesulide = fullSearch.includes('nimesulide') || fullSearch.includes('aulin') || fullSearch.includes('mesulid');
    const isDiclo = fullSearch.includes('diclofenac') || fullSearch.includes('voltaren') || fullSearch.includes('cataflam');
    drugBankId = isNimesulide ? 'DB00465' : isDiclo ? 'DB01097' : 'DB01050';
    activeIngredientsEn = isNimesulide ? 'Nimesulide 100mg' : isDiclo ? 'Diclofenac Sodium/Potassium' : 'Ibuprofen';
    therapeuticClass = 'مضاد التهاب غير ستيرويدي ومسكن قوي (NSAID & Anti-inflammatory)';
    indications = 'تسكين آلام المفاصل والروماتيزم، آلام الأسنان، آلام الدورة الشهرية الحادة، الصداع النصفي والالتهابات العضلية.';
    dosageAndAdmin = isNimesulide
      ? '• 100 ملغ (قرص أو كيس مذاب بنصف كوب ماء) مرتين يومياً بعد الأكل مباشرة لمدة أقصاها 15 يوماً فقط.'
      : isDiclo
      ? '• 50 ملغ مرتين إلى 3 مرات يومياً بعد الوجبات مباشرة مع كوب ماء وفير.'
      : '• 400 - 600 ملغ 3 مرات يومياً بعد الأكل مباشرة.';
    majorInteractions = [
      '🔴 مميعات الدم ومضادات التخثر (Warfarin, Aspirin, DOACs): تضاعف خطر النزيف وقرحة الجهاز الهضمي.',
      '🔴 أدوية الضغط (ACEIs / ARBs) ومدرات البول: يقلل مفعولها الخافض للضغط ويزيد إجهاد الكلى (Nephrotoxicity).',
      '🔴 أدوية الليثيوم (Lithium) والميثوتريكسات (Methotrexate): يقلل إطراحها ويرفع مستوياتها السمية بالدم.'
    ];
    warningsAndContraindications = [
      '🚫 ممنوع لمرضى قرحة المعدة النشطة والنزيف الهضمي والقصور الكلوي أو الكبدي الشديد.',
      '⚠️ الحذر الشديد لمرضى القلب وقصور الشرايين التاجية وضغط الدم المرتفع.',
      '🚫 يمنع استخدامه في الثلث الأخير من الحمل (خطر إغلاق القناة الشريانية الجنينية).'
    ];
    patientCounselingTip = 'يجب تناوله بعد وجبة طعام كاملة مع شرب ماء وفير لحماية المعدة، والتوقف عنه فوراً إذا ظهرت آلام حادة بالمعدة أو براز أسود.';
  }

  // -------------------------------------------------------------
  // 4. PROTON PUMP INHIBITORS (PPIs): Nexium, Controloc, Omeprazole, Pantoprazole
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('prazole') ||
    fullSearch.includes('nexium') ||
    fullSearch.includes('controloc') ||
    fullSearch.includes('losec') ||
    fullSearch.includes('esomeprazole') ||
    fullSearch.includes('pantoprazole') ||
    fullSearch.includes('omeprazole')
  ) {
    const isPanto = fullSearch.includes('pantoprazole') || fullSearch.includes('controloc');
    drugBankId = isPanto ? 'DB00213' : 'DB00736';
    activeIngredientsEn = isPanto ? 'Pantoprazole 20/40mg' : 'Esomeprazole 20/40mg';
    therapeuticClass = 'مثبطات مضخة البروتون لعلاج الحموضة والقرحة (Proton Pump Inhibitor - PPI)';
    indications = 'علاج ارتجاع المريء (GERD)، قرحة المعدة والاثني عشر، الحماية من تقرحات المسكنات، وجرثومة المعدة (H. pylori).';
    dosageAndAdmin = '• قرص واحد (20 أو 40 ملغ) صباحاً على الريق قبل الفطور بـ 30 إلى 60 دقيقة يومياً. تُبلع الحبة كاملة دون كسر أو مضغ.';
    majorInteractions = [
      isPanto
        ? '🟢 بلافيكس (Clopidogrel): البانتوبرازول هو الخيار الأكثر أماناً مع مرضى القلب لقلة تداخله مع إنزيم CYP2C19.'
        : '🔴 بلافيكس (Clopidogrel): الأوميبرازول والإيزوميبرازول يقللان فعالية البلافيكس ويرفعان خطر التجلطات.',
      '🟠 مكملات الحديد والكالسيوم ومضادات الفطريات (Ketoconazole): يقل امتصاصها نتيجة قلة حموضة المعدة.'
    ];
    warningsAndContraindications = [
      '⚠️ الاستخدام المطول لأشهر طويلة: قد يسبب نقص المغنيسيوم وفيتامين B12 وضعف امتصاص الكالسيوم.',
      '✅ ممتاز وآمن لمعظم المرضى عند الالتزام بالتوقيت الصحيح.'
    ];
    patientCounselingTip = 'تناول الحبة كاملة على معدة فارغة قبل الفطور بنصف ساعة على الأقل، حيث يفقد الدواء 50% من فعاليته إذا تم تناوله بعد الأكل.';
  }

  // -------------------------------------------------------------
  // 5. ANTIBIOTICS: Augmentin, Cefixime, Azithromycin, Cipro, Flagyl, Klacid
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('augmentin') ||
    fullSearch.includes('amoxicillin') ||
    fullSearch.includes('curam') ||
    fullSearch.includes('megamox') ||
    fullSearch.includes('cefixime') ||
    fullSearch.includes('suprax') ||
    fullSearch.includes('azithromycin') ||
    fullSearch.includes('zithromax') ||
    fullSearch.includes('ciprofloxacin') ||
    fullSearch.includes('cipro') ||
    fullSearch.includes('metronidazole') ||
    fullSearch.includes('flagyl') ||
    fullSearch.includes('clarithromycin') ||
    fullSearch.includes('klacid')
  ) {
    const isAug = fullSearch.includes('amox') || fullSearch.includes('augmentin') || fullSearch.includes('curam');
    const isAzithro = fullSearch.includes('azithro') || fullSearch.includes('zithro');
    const isCipro = fullSearch.includes('cipro');
    const isFlagyl = fullSearch.includes('metronidazole') || fullSearch.includes('flagyl');
    drugBankId = isAug ? 'DB01060' : isAzithro ? 'DB00207' : isCipro ? 'DB00537' : 'DB00916';
    activeIngredientsEn = isAug ? 'Amoxicillin + Clavulanic Acid' : isAzithro ? 'Azithromycin' : isCipro ? 'Ciprofloxacin' : isFlagyl ? 'Metronidazole' : 'Antibacterial Agent';
    therapeuticClass = 'مضاد حيوي واسع المجال (Broad-Spectrum Antibiotic)';
    indications = 'علاج العدوى البكتيرية في الجهاز التنفسي، الأذن الوسطى، اللوزتين، المسالك البولية، والأسنان.';
    dosageAndAdmin = isAzithro
      ? '• 500 ملغ قرص واحد يومياً قبل الأكل بساعة أو بعده بساعتين لمدة 3 إلى 5 أيام متتالية.'
      : isAug
      ? '• 1 غرام كل 12 ساعة في منتصف أو بداية الوجبة لتقليل اضطرابات الهضم والإسهال.'
      : isCipro
      ? '• 500 ملغ كل 12 ساعة بعيداً عن مشتقات الحليب والكالسيوم لمدة 5-7 أيام.'
      : '• 500 ملغ كل 8 ساعات بعد الأكل لمدة 5 إلى 7 أيام.';
    majorInteractions = [
      '🔴 مكملات الكالسيوم، الحديد، مضادات الحموضة، والحليب: تعطل امتصاص مضادات الفلوروكينولون والتتراسيكلين (المباعدة ساعتين على الأقل).',
      '🔴 مميعات الدم (Warfarin): معظم المضادات الحيوية ترفع سيولة الدم وخطر النزيف.',
      '🔴 الكحول مع الميترونيدازول (Flagyl): تفاعل خطير يشبه الديسولفيرام (Disulfiram Reaction) غثيان وقيء حاد وخفقان.'
    ];
    warningsAndContraindications = [
      '⚠️ إكمال كامل الكورس العلاجي حتى بعد تحسن الأعراض لمنع مقاومة البكتيريا للمضادات (Antibiotic Resistance).',
      '🚫 التأكد من عدم وجود حساسية البنسلين (Penicillin Allergy) قبل صرف مشتقات الأموكسيسيلين والسيفالوسبورين.'
    ];
    patientCounselingTip = 'يجب إكمال كامل كورس المضاد حتى آخر حبة وعدم إيقافه عند الشعور بالتحسن، مع شرب كميات وافرة من الماء وتناول الجرعات في مواعيد دقيقة.';
  }

  // -------------------------------------------------------------
  // 6. ANTIHYPERTENSIVES: Concor/Bisoprolol, Norvasc/Amlodipine, Lisinopril, Losartan
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('concor') ||
    fullSearch.includes('bisoprolol') ||
    fullSearch.includes('norvasc') ||
    fullSearch.includes('amlodipine') ||
    fullSearch.includes('losartan') ||
    fullSearch.includes('cozaar') ||
    fullSearch.includes('valsartan') ||
    fullSearch.includes('diovan') ||
    fullSearch.includes('zestril') ||
    fullSearch.includes('lisinopril')
  ) {
    const isConcor = fullSearch.includes('concor') || fullSearch.includes('bisoprolol');
    drugBankId = isConcor ? 'DB00612' : 'DB00381';
    activeIngredientsEn = isConcor ? 'Bisoprolol Fumarate (Beta-1 Blocker)' : 'Amlodipine / ARB (Antihypertensive)';
    therapeuticClass = 'خافض لضغط الدم وحامي للقلب والشرايين (Antihypertensive & Cardiovascular Agent)';
    indications = 'علاج ارتفاع ضغط الدم، حماية القلب، الوقاية من الذبحة الصدرية والسكتات الدماغية وتنظيم ضربات القلب.';
    dosageAndAdmin = '• 5 ملغ إلى 10 ملغ قرص واحد يومياً في الصباح مع وجبة الفطور (أو حسب إرشادات الطبيب الثابتة).';
    majorInteractions = [
      '🔴 المسكنات ومضادات الالتهاب (NSAIDs - Voltaren/Brufen): تعاكس التأثير الخافض للضغط وترفع ضغط الدم وتجهد الكلى.',
      '🔴 الجمع بين حاصرات بيتا وحاصرات الكالسيوم (Verapamil/Diltiazem): بطء شديد في نبضات القلب وتثبيط العضلة القلبية.'
    ];
    warningsAndContraindications = [
      '⚠️ يمنع إيقاف دواء الضغط فجأة (خطر الارتفاع الارتدادي الحاد لضغط الدم Hypertensive Rebound).',
      '⚠️ مراقبة نبض القلب دورياً (لحاصرات بيتا: ألا يقل النبض عن 55 نبضة بالدقيقة).'
    ];
    patientCounselingTip = 'يُؤخذ بانتظام في نفس الموعد كل صباح؛ قس ضغطك بشكل دوري وتجنب المسكنات القوية كالفولتارين والبروفين لأنها ترفع الضغط فوراً.';
  }

  // -------------------------------------------------------------
  // 7. DIABETES: Metformin (Glucophage), Januvia, Amaryl, Diamicron
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('metformin') ||
    fullSearch.includes('glucophage') ||
    fullSearch.includes('amaryl') ||
    fullSearch.includes('glimepiride') ||
    fullSearch.includes('januvia') ||
    fullSearch.includes('sitagliptin') ||
    fullSearch.includes('diamicron') ||
    fullSearch.includes('gliclazide')
  ) {
    const isMet = fullSearch.includes('metformin') || fullSearch.includes('glucophage');
    drugBankId = isMet ? 'DB00331' : 'DB00222';
    activeIngredientsEn = isMet ? 'Metformin HCl 500/850/1000mg' : 'Oral Hypoglycemic Agent';
    therapeuticClass = 'علاج السكري من النوع الثاني وتنظيم سكر الدم (Oral Antidiabetic Agent)';
    indications = 'تنظيم مستويات السكر في الدم، تقليل مقاومة الإنسولين، والحماية من مضاعفات السكري على المدى الطويل.';
    dosageAndAdmin = isMet
      ? '• 500 - 1000 ملغ مرتين إلى 3 مرات يومياً في منتصف أو نهاية الوجبات الرئيسية لتقليل اضطرابات المعدة.'
      : '• قرص واحد يومياً قبل وجبة الإفطار بـ 15 دقيقة مع الالتزام بتناول الطعام.';
    majorInteractions = [
      '🔴 الصبغات الإشعاعية الوريدية (Iodinated Contrast): يجب إيقاف الميتفورمين قبل الأشعة بـ 48 ساعة لمنع الفشل الكلوي الحاد.',
      '🔴 أدوية الكورتيزون وخافضات الضغط (Thiazides): ترفع مستوى السكر بالدم وتعاكس عمل العلاج.'
    ];
    warningsAndContraindications = [
      '⚠️ علامات هبوط السكر (Hypoglycemia): رجفة، تعرق بارد، دوخة، جوع شديد؛ يجب تناول عصير محلى فوراً.',
      '🚫 يمنع الميتفورمين في حالات القصور الكلوي الشديد (eGFR < 30).'
    ];
    patientCounselingTip = 'تناول حبوب الميتفورمين في منتصف الأكل لتجنب اضطراب المعدة والإسهال، واحتفظ دائماً بقطعة سكر أو عصير للتعامل مع أي هبوط مفاجئ بالسكر.';
  }

  // -------------------------------------------------------------
  // 8. ANTIHISTAMINES & ALLERGY: Telfast, Aerius, Zyrtec, Claritine, Xyzal
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('telfast') ||
    fullSearch.includes('fexofenadine') ||
    fullSearch.includes('aerius') ||
    fullSearch.includes('desloratadine') ||
    fullSearch.includes('zyrtec') ||
    fullSearch.includes('cetirizine') ||
    fullSearch.includes('claritine') ||
    fullSearch.includes('loratadine') ||
    fullSearch.includes('xyzal')
  ) {
    const isTelfast = fullSearch.includes('telfast') || fullSearch.includes('fexofenadine');
    drugBankId = isTelfast ? 'DB00950' : 'DB00341';
    activeIngredientsEn = isTelfast ? 'Fexofenadine HCl (Non-sedating Antihistamine)' : 'Antihistamine (2nd Generation)';
    therapeuticClass = 'مضاد حساسية لا يسبب النعاس (Non-Sedating H1 Antihistamine)';
    indications = 'علاج حساسية الأنف الموسمية، العطاس وسيلان الأنف، حكة العيون، والشرى الجلدي والارتيكاريا (Urticaria).';
    dosageAndAdmin = '• 120 ملغ أو 180 ملغ قرص واحد يومياً مع كوب ماء.';
    majorInteractions = [
      '🔴 عصائر الفواكه (الجريب فروت، البرتقال، التفاح مع تيلفاست): تقلل امتصاص الفيكسوفينادين بنسبة 50% عبر تثبيط ناقل OATP1A2 (يؤخذ بالماء فقط).',
      '🟠 مضادات الحموضة التي تحتوي على الألومنيوم والمغنيسيوم: تقلل الامتصاص؛ باعد بينهما ساعتين.'
    ];
    warningsAndContraindications = [
      '✅ جيل حديث آمن جداً ولا يسبب النعاس؛ مناسب لمن يمارسون أعمالاً تتطلب تركيزاً أو قيادة.',
      '⚠️ يفضل استشارة الطبيب في فترات الحمل والرضاعة.'
    ];
    patientCounselingTip = 'يُؤخذ قرص واحد يومياً مع الماء فقط وتجنب شربه مع عصير البرتقال أو الجريب فروت لضمان الفعالية التامة.';
  }

  // -------------------------------------------------------------
  // 9. GENERAL CLINICAL SMART FALLBACK (Any other Product)
  // -------------------------------------------------------------
  else {
    drugBankId = '';
    let formDetails = 'يُؤخذ بانتظام بالجرعة المقررة مع كوب ماء وفير (250 مل).';
    if (form.includes('susp') || form.includes('syrup') || form.includes('liquid') || fullSearch.includes('sospension') || fullSearch.includes('syrup')) {
      formDetails = 'يُرج المحلول جيداً قبل كل جرعة لضمان تجانس الدواء، مع استخدام المكيال المدرج المرفق بدقة.';
    } else if (form.includes('drop') || fullSearch.includes('drops')) {
      formDetails = 'تُقطر الجرعة المقررة مع تجنب ملامسة فوهة القطارة للعين أو الأذن لضمان التعقيم.';
    } else if (form.includes('efferv') || fullSearch.includes('sachet')) {
      formDetails = 'يُذاب الكيس/الفوار بالكامل في نصف كوب ماء ويُشرب مباشرة بعد الفوران.';
    }

    activeIngredientsEn = sciName || name;
    therapeuticClass = 'دواء صيدلاني علاجي (Pharmaceutical Agent)';
    indications = 'يُستخدم وفق دواعي الاستعمال الطبية المعتمدة للمادة الفعالة والشكل الصيدلاني.';
    dosageAndAdmin = `• ${formDetails} مع مراعاة تناوله في نفس الموعد يومياً للمحافظة على تركيز ثابت بالدم.`;
    majorInteractions = [
      '🔴 تفاعلات معززة للسمية: استشر الصيدلي دائماً عند استخدام أدوية السيولة، مسكنات الروماتيزم، أو أدوية الأمراض المزمنة.',
      '🟠 مكملات المعادن ومضادات الحموضة: باعد ساعتين عن تناول الحديد والكالسيوم ومضادات الحموضة.'
    ];
    warningsAndContraindications = [
      '⚠️ الالتزام الصارم بالجرعات الموصوفة وتجنب مضاعفة الجرعة عند النسيان.',
      '⚠️ إبلاغ الصيدلي عن أي تاريخ مرضي أو حمل أو رضاعة قبل الاستخدام.'
    ];
    patientCounselingTip = 'احرص على سؤال المريض عن الأدوية المزمنة الأخرى التي يتناولها، والتأكيد على تناول الدواء بانتظام في مواعيده المحددة.';
  }

  // Construct DrugBank Direct URL
  const drugBankUrl = drugBankId
    ? `https://go.drugbank.com/drugs/${drugBankId}`
    : `https://go.drugbank.com/unearth/q?query=${cleanDrugQuery(name, sciName)}`;

  // Construct Formatted Concise WhatsApp & UI Clinical Capsule Message
  const fullMessageText = `🌿 *كبسولة صيدلية بيتك السريرية • الدليل الدوائي السريع* 💊✨
━━━━━━━━━━━━━━━━━━━
👤 مرحباً بك يا *{name}* في التدريب الصيدلاني السريع!
📦 *الدواء (Brand):* *${name}*
🧪 *التركيبة (Active Ingredient):* ${activeIngredientsEn}
🎯 *الفئة الدوائية (Class):* ${therapeuticClass}
━━━━━━━━━━━━━━━━━━━
🎯 *1. دواعي الاستعمال (Indications):*
• ${indications}

⏱️ *2. طريقة الاستخدام والجرعة (Dosage & Administration):*
${dosageAndAdmin}

🚫 *3. أهم التداخلات الدوائية (Major Drug Interactions):*
${majorInteractions.map((i) => `• ${i}`).join('\n')}

⚠️ *4. موانع وتحذيرات هامة (Contraindications & Warnings):*
${warningsAndContraindications.map((w) => `• ${w}`).join('\n')}

💡 *5. نصيحة الصرف الذهبية للمريض (Patient Counseling):*
• ${patientCounselingTip}
━━━━━━━━━━━━━━━━━━━
🔗 *المرجع العلمي المعتمد:* ${drugBankUrl}
🌿 *صيدلية بيتك.. رعاية صيدلانية متكاملة ومبسطة!* ✨`;

  return {
    productName: name,
    scientificName: activeIngredientsEn,
    drugBankId,
    drugBankUrl,
    indications,
    dosageAndAdmin,
    majorInteractions,
    warningsAndContraindications,
    patientCounselingTip,
    fullMessageText,
    // Backwards compatibility bindings
    mechanismAndPk: indications,
    cypMetabolism: therapeuticClass,
    usageTiming: dosageAndAdmin,
    goldenCounselingTip: patientCounselingTip,
    foodAndAlcoholInteractions: warningsAndContraindications,
    blackBoxAndWarnings: warningsAndContraindications
  };
}

export const DEFAULT_CLINICAL_PRODUCTS: ClinicalProductInput[] = [
  { id: '1', name: '1, 2, 3 Cold & Flu Syrup', scientificName: 'Paracetamol + Pseudoephedrine + Chlorpheniramine', dosageForm: 'Syrup', category: 'MEDICINES', stockOnHand: 45, sellPrice: 8.5 },
  { id: '2', name: 'Aulin 100mg sospension (Nimesulide)', scientificName: 'Nimesulide 100mg', dosageForm: 'Suspension', category: 'MEDICINES', stockOnHand: 28, sellPrice: 24.0 },
  { id: '3', name: 'Nexium 40mg Tab (Esomeprazole)', scientificName: 'Esomeprazole 40mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 24, sellPrice: 48.0 },
  { id: '4', name: 'Glucophage 500mg (Metformin)', scientificName: 'Metformin HCl 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 35, sellPrice: 15.5 },
  { id: '5', name: 'Lipitor 20mg (Atorvastatin)', scientificName: 'Atorvastatin 20mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 18, sellPrice: 52.0 },
  { id: '6', name: 'Augmentin 1g Tab (Amoxicillin/Clavulanate)', scientificName: 'Amoxicillin + Clavulanic Acid 1g', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 42, sellPrice: 38.0 },
  { id: '7', name: 'Concor 5mg (Bisoprolol)', scientificName: 'Bisoprolol Fumarate 5mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 28, sellPrice: 26.0 },
  { id: '8', name: 'Voltaren 50mg (Diclofenac Sodium)', scientificName: 'Diclofenac Sodium 50mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 50, sellPrice: 18.0 },
  { id: '9', name: 'Panadol Extra Tab (Paracetamol + Caffeine)', scientificName: 'Paracetamol 500mg + Caffeine 65mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 65, sellPrice: 12.0 },
  { id: '10', name: 'Telfast 180mg Tab (Fexofenadine)', scientificName: 'Fexofenadine HCl 180mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 22, sellPrice: 32.0 },
  { id: '11', name: 'Controloc 40mg (Pantoprazole)', scientificName: 'Pantoprazole 40mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 25, sellPrice: 44.0 },
  { id: '12', name: 'Brufen 400mg (Ibuprofen)', scientificName: 'Ibuprofen 400mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 55, sellPrice: 14.0 },
  { id: '13', name: 'Zithromax 500mg (Azithromycin)', scientificName: 'Azithromycin 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 16, sellPrice: 42.0 },
  { id: '14', name: 'Duspatalin 200mg Retard (Mebeverine)', scientificName: 'Mebeverine HCl 200mg', dosageForm: 'Capsules', category: 'MEDICINES', stockOnHand: 26, sellPrice: 35.0 },
  { id: '15', name: 'Xarelto 20mg Tab (Rivaroxaban)', scientificName: 'Rivaroxaban 20mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 10, sellPrice: 180.0 }
];
