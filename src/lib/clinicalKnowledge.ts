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
  usageTiming: string;
  commonErrors: string[];
  interactions: string[];
  lifestyleAdvice: string[];
  goldenCounselingTip: string;
  fullMessageText: string;
}

/**
 * Advanced Clinical Pharmacy Expert System & Pharmacotherapy Counseling Engine.
 * Formulated with exact pharmacological mechanisms, kinetics, interactions, and clinical counseling rules.
 */
export function generateClinicalCapsule(product: ClinicalProductInput): ClinicalCapsuleData {
  const name = (product.name || '').trim();
  const sciName = (product.scientificName || '').trim();
  const fullSearch = `${name} ${sciName}`.toLowerCase();
  const form = (product.dosageForm || '').toLowerCase();

  let usageTiming = '';
  let commonErrors: string[] = [];
  let interactions: string[] = [];
  let lifestyleAdvice: string[] = [];
  let goldenCounselingTip = '';

  // -------------------------------------------------------------
  // 1. NIMESULIDE & AULIN (Specific Match for Aulin, Mesulid, Nimed, Scaflam)
  // -------------------------------------------------------------
  if (
    fullSearch.includes('aulin') ||
    fullSearch.includes('nimesulide') ||
    fullSearch.includes('mesulid') ||
    fullSearch.includes('nimed') ||
    fullSearch.includes('scaflam')
  ) {
    usageTiming = 'يُؤخذ بدقة بعد وجبة طعام كاملة مع كوب ماء وفير (أكياس الفوار والمعلق تُذاب في نصف كوب ماء بعد الأكل مباشرة). الجرعة الاعتيادية: 100 ملغ مرتين يومياً.';
    commonErrors = [
      'استخدام الدواء كمسكن مزمن لفترات طويلة تتجاوز 15 يوماً، مما يرفع احتمالية التسمم الكبدي الحاد (Hepatotoxicity).',
      'تناول الدواء على معدة فارغة أو تناوله مع مسكنات أخرى من عائلة مضادات الالتهاب غير الستيرويدية (NSAIDs).',
      'تجاهل الأعراض الأولية للإجهاد الكبدي كفقدان الشهية المفاجئ والغثيان.'
    ];
    interactions = [
      'الحذر الشديد من تزامنه مع الأدوية السامة للكبد (Hepatotoxic Drugs) مثل الجرعات العالية من الباراسيتامول، الكيتوكونازول، أو الميثوتريكسات.',
      'يتعارض بشدة مع مميعات الدم ومضادات التخثر (Warfarin, NOACs, Aspirin) ويزيد خطر النزيف الهضمي الحاد.',
      'يقلل من فعالية أدوية الضغط ومدرات البول من فئة الفيروسيميد ومثبطات ACE.'
    ];
    lifestyleAdvice = [
      'الامتناع التام عن تناول المشروبات الكحولية طوال فترة العلاج لحماية خلايا الكبد من الإجهاد التأكسدي.',
      'التوقف الفوري عن الدواء ومراجعة الطبيب عند ملاحظة بول داكن (كلون الشاي) أو اصفرار بياض العين أو آلام بأعلى يمين البطن.',
      'الالتزام بأقصر فترة علاجية ممكنة (Shortest Effective Duration) بما لا يتجاوز 15 يوماً متواصلة.'
    ];
    goldenCounselingTip = 'نيميسوليد مسكن نوعي ممتاز للآلام الحادة وعسر الطمث الأولي، ولكنه يعتبر خطاً علاجياً ثانياً (Second-line)؛ نبه المريض بحزم بعدم تجاوز 100 ملغ مرتين يومياً ولا يزيد الكورس عن 15 يوماً مع مراقبة وظائف الكبد.';
  }

  // -------------------------------------------------------------
  // 2. DICLOFENAC (Voltaren, Cataflam, Olfen, Rota, Diclogesic, Diclac)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('diclofenac') ||
    fullSearch.includes('voltaren') ||
    fullSearch.includes('cataflam') ||
    fullSearch.includes('olfen') ||
    fullSearch.includes('diclo') ||
    fullSearch.includes('diclac')
  ) {
    usageTiming = 'يُؤخذ بعد الأكل مباشرة مع كوب ماء كامل. ملح البوتاسيوم (Cataflam) سريع الامتصاص للصداع والأسنان، وملح الصوديوم (Voltaren) ممتد المفعول للالتهابات المزمنة.';
    commonErrors = [
      'صرفه لمرضى قصور القلب الاحتقاني (Heart Failure) أو مرضى الشرايين التاجية والضغط غير المنضبط حيث يرفع المخاطر القلبية الوعائية (CV Risk).',
      'تناول جرعات متكررة على معدة فارغة دون حماية المعدة بمثبطات مضخة البروتون (PPI).'
    ];
    interactions = [
      'يرفع تركيز الليثيوم (Lithium) والديجوكسين (Digoxin) والميثوتريكسات في الدم ويقود للتسمم الدوائي.',
      'يزيد خطر القرحة والنزيف المعدي عند المشاركة مع الكورتيزون أو مضادات التخثر أو الأسبرين.'
    ];
    lifestyleAdvice = [
      'عدم الاستلقاء مباشرة بعد تناول القرص لمدة 15 دقيقة لتفادي التخريش المريئي.',
      'شرب كميات وفيرة من السوائل للحد من التأثير السلبي على التروية الكلوية ومعدل الترشيح GFR.'
    ];
    goldenCounselingTip = 'اختر كتافلام (بوتاسيوم) للآلام الحادة المفاجئة لسرعة امتصاصه، وفولتارين (صوديوم) لالتهاب المفاصل، وتجنب صرفه تماماً لمرضى الجلطات السابقة أو قرحة المعدة النشطة.';
  }

  // -------------------------------------------------------------
  // 3. PARACETAMOL (Panadol, Calpol, Adol, Cetamol, Tylenol, Febricol)
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
    usageTiming = 'يُؤخذ كل 6 إلى 8 ساعات عند اللزوم مع أو بدون طعام. الجرعة القصوى للبالغين: 4000 ملغ (8 أقراص عيار 500 ملغ) خلال 24 ساعة.';
    commonErrors = [
      'الجمع بين البنادول وأدوية نزلات البرد والسعال المركبة (مثل Fludrex, Panadol Cold & Flu) في آن واحد مما يسبب تجاوز الجرعة السامة وتلف الكبد.',
      'استخدامه المتزامن مع استهلاك الكحول المزمن أو في حالات الصيام الشديد وسوء التغذية دون تعديل الجرعة.'
    ];
    interactions = [
      'الاستخدام اليومي المزمن لجرعات عالية (أكثر من 2 غرام يومياً) يرفع مفعول الوارفارين (Warfarin) ويزيد مؤشر INR وخطر النزيف.',
      'أدوية الصرع المحفزة للإنزيمات الكبدية (Carbamazepine, Phenytoin) تسرع تحوله للمستقلب السام NAPQI.'
    ];
    lifestyleAdvice = [
      'التحقق دائماً من محتويات أكياس فوار الرشح والمسكنات الأخرى قبل أخذ جرعة باراسيتامول إضافية.',
      'حساب جرعة الأطفال بدقة بناءً على الوزن الفعلي (10-15 ملغ/كغ/جرعة) وليس على أساس العمر التقريبي.'
    ];
    goldenCounselingTip = 'الباراسيتامول هو خط الأمان الأول للحوامل والمرضعات ومرضى القرحة والكلى؛ لكن احرص دائماً على تذكير المريض بعدم تجاوز 4 غرام يومياً والتأكد من عدم تكراره في أدوية الرشح الأخرى.';
  }

  // -------------------------------------------------------------
  // 4. PROTON PUMP INHIBITORS (Nexium, Controloc, Losec, Omeprazole, Pantoprazole, Pariet, Esomeprazole)
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
    usageTiming = 'يُؤخذ على معدة خاوية تماماً صباحاً قبل وجبة الإفطار بـ 30 إلى 60 دقيقة يومياً. في الحالات الشديدة تؤخذ جرعة ثانية قبل العشاء بنصف ساعة.';
    commonErrors = [
      'تناول القرص بعد الأكل أو مع وجبة الطعام، مما يقلل من التوافر الحيوي بنسبة تتجاوز 50%.',
      'كسر أو سحق أو مضغ الكبسولات أو الحبوب المغلفة معوياً (Enteric Coated).'
    ];
    interactions = [
      'يتداخل الأوميبرازول والإيزوميبرازول مع دواء السيولة بلافيكس (Clopidogrel) عبر تثبيط CYP2C19، بينما يُعد البانتوبرازول (Pantoprazole) هو الخيار الأكثر أماناً.',
      'يقلل الاستخدام المزمن من امتصاص فيتامين B12 والحديد والكالسيوم والمغنيسيوم.'
    ];
    lifestyleAdvice = [
      'الانتظار ساعتين على الأقل بعد تناول الطعام قبل الاستلقاء أو النوم لتقليل الارتجاع المريئي الليلي.',
      'تجنب الأغذية المحفزة للحموضة (الدهون المشبعة، الشوكولاتة، النعناع، المشروبات الغازية، والكافيين).'
    ];
    goldenCounselingTip = 'انصح المريض ببلع الحبة كاملة قبل الفطور بنصف ساعة، واشرح له أن البانتوبرازول هو الأنسب لمرضى القلب على البلافيكس، وأن الدواء يحتاج 3 إلى 4 أيام للوصول لذروة كفاءته العلاجية.';
  }

  // -------------------------------------------------------------
  // 5. METFORMIN & BIGUANIDES (Glucophage, Cidophage, Formet, Glucovance)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('metformin') ||
    fullSearch.includes('glucophage') ||
    fullSearch.includes('cidophage') ||
    fullSearch.includes('formet')
  ) {
    usageTiming = 'يُؤخذ في منتصف الوجبة الرئيسية أو في نهايتها مباشرة مع كوب ماء للحد من الأعراض الجانبية الهضمية. تركيبة XR ممتدة المفعول تؤخذ مع وجبة العشاء.';
    commonErrors = [
      'أخذ الدواء على معدة فارغة مما يسبب إسهالاً وتقلصات وغثياناً حاداً يدفع المريض لتركه.',
      'إيقاف العلاج تلقائياً عند انتظام قراءات السكر التراكمي ظناً بالشفاء التام من السكري.'
    ];
    interactions = [
      'يجب إيقاف الميتفورمين مؤقتاً قبل 48 ساعة من إجراء الفحوصات الإشعاعية بالصبغة اليودية (Iodinated Contrast Media) لتفادي خطر الحماض اللبني والفشل الكلوي.',
      'الحذر مع الكحول والمدرات القوية التي قد ترفع حمض اللاكتيك.'
    ];
    lifestyleAdvice = [
      'فحص مستوى فيتامين B12 سنوياً، حيث يقلل الميتفورمين من امتصاصه في اللفائفي مع طول فترة الاستخدام.',
      'المحافظة على شرب 2-3 لتر ماء يومياً وممارسة الرياضة لتعزيز حساسية مستقبلات الإنسولين.'
    ];
    goldenCounselingTip = 'طمئن المريض بأن اضطرابات الجهاز الهضمي والغازات مؤقتة وستختفي تدريجياً خلال أسبوعين إذا التزم بأخذ القرص وسط الأكل، وتأكد من وظائف الكلى (eGFR > 30) دورياً.';
  }

  // -------------------------------------------------------------
  // 6. SGLT-2 INHIBITORS (Jardiance, Forxiga, Empagliflozin, Dapagliflozin, Steglatro)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('gliflozin') ||
    fullSearch.includes('jardiance') ||
    fullSearch.includes('forxiga') ||
    fullSearch.includes('empa') ||
    fullSearch.includes('dapa')
  ) {
    usageTiming = 'يُؤخذ صباحاً قرص واحد يومياً مع أو بدون طعام، مع التأكيد على تناول كميات وافرة من السوائل طوال ساعات النهار.';
    commonErrors = [
      'إهمال شرب الماء مما يقود للجفاف، هبوط الضغط الانتصابي، وارتفاع الكرياتينين.',
      'إهمال النظافة الشخصية الجافة والتناسلية بعد التبول مما يرفع خطر العدوى الفطرية التناسلية والتهابات المسالك.'
    ];
    interactions = [
      'المشاركة مع مدرات البول الثيازيدية أو العروية تزيد خطر الجفاف وهبوط الضغط الحاد.',
      'الحذر عند التزامن مع الإنسولين؛ يجب تخفيض جرعة الإنسولين لتجنب الحماض الكيتوني السكري السوي السكر (Euglycemic DKA).'
    ];
    lifestyleAdvice = [
      'شرب ما لا يقل عن 2 إلى 2.5 لتر ماء يومياً لتعويض الطرح البولي للسكر والصوديوم.',
      'الفحص الدوري للقدمين والانتباه لأي جروح أو التهابات مسالك بولية ومراجعة الطبيب عند وجود حرقان بولي.'
    ];
    goldenCounselingTip = 'دواء استثنائي يحمي القلب ويقلل تدهور وظائف الكلى؛ شدد على المريض بضرورة شرب الماء بكثرة والمحافظة على النظافة التناسلية والانتباه لأي أعراض دوخة أو خمول غير مبرر.';
  }

  // -------------------------------------------------------------
  // 7. STATINS & LIPID LOWERING (Lipitor, Crestor, Atorvastatin, Rosuvastatin, Simvastatin, Lipanthyl)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('statin') ||
    fullSearch.includes('lipitor') ||
    fullSearch.includes('crestor') ||
    fullSearch.includes('ator') ||
    fullSearch.includes('rosu') ||
    fullSearch.includes('simva') ||
    fullSearch.includes('lipanthyl') ||
    fullSearch.includes('fenofibrate')
  ) {
    usageTiming = 'يُفضل تناوله مساءً أو قبل النوم (السيمفاستاتين حتماً بالمساء، الأتورفاستاتين والروتسوفاستاتين بأي وقت ثابت ويفضل مساءً).';
    commonErrors = [
      'شرب عصير الجريب فروت (Grapefruit Juice) الذي يثبط إنزيم CYP3A4 ويرفع تركيز الدواء السام بالدم.',
      'إيقاف الدواء عند تحسن التحاليل المخبرية؛ فالستاتين علاج وقائي مستمر لتثبيت صفائح التصلب الشرياني (Plaque Stabilization).'
    ];
    interactions = [
      'المشاركة مع المضادات الحيوية الماكروليدية (Clarithromycin, Erythromycin) ومضادات الفطريات ترفع خطر انحلال الربيدات (Rhabdomyolysis).',
      'الحذر من الجمع مع الفينوفايبرات بجرعات غير مدروسة دون متابعة إنزيمات العضلات CK.'
    ];
    lifestyleAdvice = [
      'اتباع حمية البحر الأبيض المتوسط منخفضة الدهون المتحولة لتعظيم الفائدة الوقائية.',
      'ممارسة المشي المنتظم والإبلاغ الفوري عن أي آلام عضلية شديدة أو بول بني داكن.'
    ];
    goldenCounselingTip = 'أكد للمريض أن الستاتين يحمي بطانة الشرايين من الجلطات وليس مجرد خافض مؤقت؛ وطمئنه بشأن سلامة الدواء مع تنبيهه لمراجعة الصيدلية عند الشعور بوهن عضلي غير مبرر.';
  }

  // -------------------------------------------------------------
  // 8. BETA BLOCKERS (Concor, Bisoprolol, Inderal, Propranolol, Atenolol, Tenormin, Dilatrend, Carvedilol, Nebilet, Nebivolol)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('concor') ||
    fullSearch.includes('bisoprolol') ||
    fullSearch.includes('inderal') ||
    fullSearch.includes('propranolol') ||
    fullSearch.includes('atenolol') ||
    fullSearch.includes('tenormin') ||
    fullSearch.includes('dilatrend') ||
    fullSearch.includes('carvedilol') ||
    fullSearch.includes('nebilet') ||
    fullSearch.includes('nebivolol') ||
    fullSearch.includes('olol')
  ) {
    usageTiming = 'يُؤخذ صباحاً في نفس الموعد مع وجبة الإفطار لتجنب الغثيان، مع مراقبة النبض بانتظام (ألا يقل النبض أثناء الراحة عن 55-60 نبضة/دقيقة).';
    commonErrors = [
      'الإيقاف المفاجئ للدواء مما يقود لارتفاع ضغط ارتدادي خطير وتسارع ضربات القلب (Rebound Tachycardia & Angina).',
      'صرف حاصرات بيتا غير الانتقائية (مثل إندرال) لمرضى الربو القصبي وحساسية الصدر حيث تسبب تضيقاً حاداً بالشعب الهوائية.'
    ];
    interactions = [
      'يتعارض مع حاصرات قنوات الكالسيوم غير الديهيدروبيريدينية (Verapamil, Diltiazem) ويسبب إحصاراً قلبياً حاداً (Severe Bradycardia/AV Block).',
      'المسكنات NSAIDs تعاكس أثره الخافض للضغط عن طريق حبس الصوديوم والماء.'
    ];
    lifestyleAdvice = [
      'تنبيه مريض السكري بأن الدواء قد يخفي معظم أعراض هبوط السكر (كالرعشة وخفقان القلب)، بينما يظل التعرق هو العلامة الوحيدة الظاهرة.',
      'التدرج البطيء في خفض الجرعة تحت إشراف الطبيب عند الرغبة في إيقافه.'
    ];
    goldenCounselingTip = 'حاصرات بيتا تحمي القلب وتقلل الجهد القلبي؛ حذر المريض بشدة من قطع الدواء فجأة، وعلّمه قياس النبض، واستخدم النيبيفيلول (Nebilet) كخيار نوعي أقل تأثيراً على القدرة الجنسية وتدفق الأطراف.';
  }

  // -------------------------------------------------------------
  // 9. ACE INHIBITORS & ARBs (Capoten, Zestril, Lisinopril, Diovan, Valsartan, Atacand, Candesartan, Cozaar, Losartan, Exforge, Tareg)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('sartan') ||
    fullSearch.includes('pril') ||
    fullSearch.includes('diovan') ||
    fullSearch.includes('atacand') ||
    fullSearch.includes('cozaar') ||
    fullSearch.includes('exforge') ||
    fullSearch.includes('zestril') ||
    fullSearch.includes('capoten') ||
    fullSearch.includes('valsa') ||
    fullSearch.includes('cande') ||
    fullSearch.includes('losar')
  ) {
    usageTiming = 'يُؤخذ قرص واحد يومياً في موعد ثابت صباحاً أو مساءً مع أو بدون طعام، مع قياس الضغط دورياً.';
    commonErrors = [
      'تناول بدائل الملح المحتوية على كلوريد البوتاسيوم أو مكملات البوتاسيوم دون استشارة مما يقود لفرط بوتاسيوم الدم القاتل (Hyperkalemia).',
      'استخدامه أثناء الحمل (ممنوع منعاً باتاً لسميته الجنينية وتشوهات الكلى Fetotoxic).'
    ];
    interactions = [
      'المسكنات NSAIDs تثبط اصطناع البروستاغلاندين الكلوي وتسبب هبوطاً حاداً في وظائف الكلى عند المشاركة (Triple Whammy Effect).',
      'المشاركة مع مدرات البول الحافظة للبوتاسيوم (Spironolactone, Aldactone) ترفع البوتاسيوم لمستويات خطيرة.'
    ];
    lifestyleAdvice = [
      'لمستخدمي فئة ACEIs (مثل ليزينوبريل): السعال الجاف غير المستجيب للمهدئات سببه تراكم البراديكينين والحل هو الاستبدال بفئة السارتان (ARBs).',
      'فحص الكرياتينين والبوتاسيوم بعد أسبوعين من بدء العلاج أو زيادة الجرعة.'
    ];
    goldenCounselingTip = 'أدوية السارتان ممتازة لحماية كلى مرضى السكري وتقليل بروتين البول؛ تأكد من عدم وجود حمل، وحذر من مسكنات البروفين والفولتارين لأنها ترفع الضغط وتجهد الكلى.';
  }

  // -------------------------------------------------------------
  // 10. CALCIUM CHANNEL BLOCKERS (Norvasc, Amlodipine, Adalat, Nifedipine, Plendil, Felodipine)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('dipine') ||
    fullSearch.includes('norvasc') ||
    fullSearch.includes('amlo') ||
    fullSearch.includes('adalat') ||
    fullSearch.includes('nifedi')
  ) {
    usageTiming = 'يُؤخذ قرص واحد يومياً ويفضل صباحاً مع أو بدون طعام.';
    commonErrors = [
      'الخوف والقلق من تورم الكاحلين والقدمين (Ankle Edema) وظن المريض أنه فشل كلوي، بينما هو أثر جانبي وعائي سليم نتيجة التوسع الشرياني المحيطي.',
      'أخذ حبة إضافية عند الشعور بالصداع في بداية العلاج.'
    ];
    interactions = [
      'يتأثر بالجريب فروت الذي يرفع تركيز الأملوديبين في الدم ويسبب هبوط ضغط مفرط وتسارع انعكاسي.',
      'يزيد تركيز السيمفاستاتين بالدم (يجب ألا تتجاوز جرعة Simvastatin عيار 20 ملغ مع Amlodipine).'
    ];
    lifestyleAdvice = [
      'رفع الساقين للأعلى أثناء الجلوس أو الاسترخاء لتقليل تجمع السوائل في الكاحل.',
      'النهوض التدريجي من وضعية الاستلقاء لتفادي الدوار وهبوط الضغط الموضعي.'
    ];
    goldenCounselingTip = 'الأملوديبين خافض ضغط فعال ومريح لا يتأثر بوظائف الكلى؛ طمئن المريض بشأن تورم القدمين الخفيف وأنه يقل عند إضافة دواء سارتان، وتجنب الجريب فروت.';
  }

  // -------------------------------------------------------------
  // 11. ANTIBIOTICS - MACROLIDES, QUINOLONES, CEPHALOSPORINS, PENICILLINS (Augmentin, Klacid, Zithromax, Cipro, Tavanic, Cefixime, Suprax, Rocephin, Doxycycline, Flagyl)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('augmentin') ||
    fullSearch.includes('amoxicillin') ||
    fullSearch.includes('clav') ||
    fullSearch.includes('klacid') ||
    fullSearch.includes('clarithro') ||
    fullSearch.includes('zithro') ||
    fullSearch.includes('azithro') ||
    fullSearch.includes('cipro') ||
    fullSearch.includes('tavanic') ||
    fullSearch.includes('levoflox') ||
    fullSearch.includes('cefix') ||
    fullSearch.includes('suprax') ||
    fullSearch.includes('doxycycl') ||
    fullSearch.includes('flagyl') ||
    fullSearch.includes('metronid') ||
    fullSearch.includes('curam') ||
    fullSearch.includes('ceftriax') ||
    fullSearch.includes('roceph') ||
    fullSearch.includes('cillin') ||
    fullSearch.includes('mycin') ||
    fullSearch.includes('floxacin')
  ) {
    usageTiming = 'الالتزام الصارم بمواعيد الجرعات بفواصل زمنية متساوية (كل 8 ساعات أو كل 12 ساعة بدقة بالغة). الأوجمنتين يُؤخذ مع بداية الوجبة لتقليل الإسهال، والسيبروفلوكساسين مع كوب ماء كبير.';
    commonErrors = [
      'إيقاف المضاد الحيوي بمجرد اختفاء الحرارة أو الشعور بالتحسن، مما يقود لطفرات البكتيريا المقاومة للمضادات (Antimicrobial Resistance).',
      'تناول الدوكسيسيكلين أو الكينولونات مع الحليب، اللبن، الكالسيوم، الحديد، أو مضادات الحموضة مما يبطل امتصاصها بالاستخلاب (Chelation).'
    ];
    interactions = [
      'تفاعل الميترونيدازول (Flagyl) مع الكحول يسبب تفاعل ديسلفرام شديد (Disulfiram-like: قيء، تسارع ضربات، هبوط ضغط).',
      'الكلاريثروميسين (Klacid) مثبط قوي لـ CYP3A4 وممنوع تزامنه مع الستاتين والمهدئات.',
      'المباعدة ساعتين على الأقل بين المضاد الحيوي ومكملات البروبيوتيك (بكتيريا الأمعاء النافعة).'
    ];
    lifestyleAdvice = [
      'الدوكسيسيكلين (Doxycycline): يُبلع مع كوب ماء كامل والبقاء في وضعية الجلوس أو الوقوف لمدة 30 دقيقة على الأقل لتجنب تقرح وثقب المريء الكيميائي.',
      'شرب كميات وفيرة من السوائل لمنع ترسب بلورات الكينولونات في الكلى (Crystalluria).'
    ];
    goldenCounselingTip = 'أكد بحزم على إكمال الكورس العلاجي بالكامل حتى آخر قرص، ونبه المريض للفصل ساعتين بين المضاد ومشتقات الألبان والمعادن، واشرح لمستخدم الفلاجيل الامتناع التام عن الكحول.';
  }

  // -------------------------------------------------------------
  // 12. THYROID THERAPY (Eltroxin, Levothyroxine, Thyroxine, Euthyrox)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('eltroxin') ||
    fullSearch.includes('levothyrox') ||
    fullSearch.includes('thyrox') ||
    fullSearch.includes('euthyrox')
  ) {
    usageTiming = 'يُؤخذ قرص واحد صباحاً على معدة فارغة تماماً قبل وجبة الإفطار بـ 60 دقيقة مع كوب ماء نقي فقط (أو قبل النوم بـ 3-4 ساعات بعد آخر وجبة).';
    commonErrors = [
      'تناول الحبة مع فنجان القهوة أو الشاي أو الحليب مما يقلل امتصاص الهرمون بنسبة تتجاوز 40%.',
      'تناول حبوب الكالسيوم أو الحديد أو مضادات الحموضة في نفس التوقيت (يجب الفصل 4 ساعات كاملة على الأقل).'
    ];
    interactions = [
      'مكملات الكالسيوم، الحديد، حبوب التخسيس (Orlistat)، ومثبطات PPI تقلل من التوافر الحيوي لليفوثيروكسين بشدة.',
      'تعديل جرعة الإلتروكسين قد يتطلب تعديل جرعة أدوية السكري والوارفارين.'
    ];
    lifestyleAdvice = [
      'الالتزام بنفس الماركة الدوائية وتجنب التبديل التجاري دون فحص مخبري، نظراً لضيق النطاق العلاجي (Narrow Therapeutic Index).',
      'إجراء فحص TSH الدوري كل 6-8 أسابيع بعد أي تعديل في الجرعة.'
    ];
    goldenCounselingTip = 'امتصاص هرمون الغدة دقيق وحساس جداً؛ شدد على المريض ببلع الحبة فور الاستيقاظ بالماء فقط، والانتظار ساعة كاملة قبل الفطور أو القهوة، وفصلها 4 ساعات عن الحديد والكالسيوم.';
  }

  // -------------------------------------------------------------
  // 13. ANTICOAGULANTS & ANTIPLATELETS (Aspirin Protect, Plavix, Clopidogrel, Xarelto, Rivaroxaban, Eliquis, Apixaban, Warfarin, Sintrom)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('aspirin') ||
    fullSearch.includes('plavix') ||
    fullSearch.includes('clopidogrel') ||
    fullSearch.includes('xarelto') ||
    fullSearch.includes('rivaroxaban') ||
    fullSearch.includes('eliquis') ||
    fullSearch.includes('apixaban') ||
    fullSearch.includes('warfarin') ||
    fullSearch.includes('sintrom')
  ) {
    usageTiming = 'الأسبرين بعد الغداء مع كوب ماء كامل. الزاريلتو (عيار 15 و 20 ملغ) يجب تناوله مع وجبة طعام دسمة لضمان امتصاصه بنسبة 100%. الإليكويس كل 12 ساعة بانتظام.';
    commonErrors = [
      'تناول مسكنات عائلة NSAIDs (كالبروفين والفولتارين) دون إشراف طبي مما يضاعف خطر النزيف الهضمي الحاد.',
      'إيقاف الدواء تلقائياً قبل زيارة طبيب الأسنان أو العمليات الجراحية دون استشارة طبيب القلب المشرف.'
    ];
    interactions = [
      'تفاعلات خطيرة مع الأعشاب المسببة للسيولة (الجنكة، الثوم، الزنجبيل بجرعات مكثفة، نبتة سانت جون).',
      'الأوميبرازول يعطل مفعول البلافيكس (Clopidogrel) ويجب استبداله بالبانتوبرازول.'
    ];
    lifestyleAdvice = [
      'الانتباه لعلامات النزيف غير المعتاد: نزيف اللثة المستمر، الكدمات الجلدية العفوية، القيء المدمم، أو البراز الأسود القطراني.',
      'استخدام فرشاة أسنان ناعمة وتجنب الرياضات العنيفة المعرضة للإصابات المباشرة.'
    ];
    goldenCounselingTip = 'مضادات التخثر صمام أمان ضد الجلطات؛ نبه المريض بتناول الزاريلتو مع الأكل لامتصاص كامل، وحذره من خلط المسكنات مع الأسبرين واستخدام الباراسيتامول فقط عند الصداع أو الألم.';
  }

  // -------------------------------------------------------------
  // 14. RESPIRATORY & INHALERS (Ventolin, Salbutamol, Symbicort, Seretide, Foster, Spiriva, Pulmicort, Flixotide, Atrovent)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('inhaler') ||
    fullSearch.includes('ventolin') ||
    fullSearch.includes('salbutamol') ||
    fullSearch.includes('symbicort') ||
    fullSearch.includes('seretide') ||
    fullSearch.includes('foster') ||
    fullSearch.includes('spiriva') ||
    fullSearch.includes('pulmicort') ||
    fullSearch.includes('flixotide') ||
    fullSearch.includes('atrovent') ||
    form.includes('inhal')
  ) {
    usageTiming = 'بخاخات الإنقاذ السريعة (Ventolin) عند اللزوم ونوبات الضيق. بخاخات الوقاية الكورتيزونية (Symbicort, Seretide) مرتين يومياً بانتظام صباحاً ومساءً.';
    commonErrors = [
      'عدم المضمضة وغسل الفم بالماء وبصقه بعد استخدام بخاخات الكورتيزون، مما يؤدي لظهور فطريات الفم البيضاء (Oral Candidiasis) وبحة الصوت.',
      'البخ السريع دون إخراج هواء الزفير أولاً أو استنشاق الدواء دون كتم النفس 10 ثوانٍ في الرئتين.',
      'عدم الترتيب: يجب أخذ البخاخ الموسع أولاً، ثم الانتظار 5 دقائق قبل بخاخ الكورتيزون لضمان وصوله للشعب العميقة.'
    ];
    interactions = [
      'حاصرات بيتا غير الانتقائية (كالبروبرانولول) تعاكس مفعول الفنتولين وتسبب نوبات ربو حادة.'
    ];
    lifestyleAdvice = [
      'تنظيف القطعة الفموية للبخاخ أسبوعياً بالماء الدافئ وتجفيفها بالهواء.',
      'استخدام القمع المباعد (Spacer) للأطفال وكبار السن لرفع كفاءة وصول الدواء للرئتين بنسبة 70% وتقليل الترسب الفموي.'
    ];
    goldenCounselingTip = 'درب المريض عملياً: زفير كامل ➔ إحكام الشفتين ➔ ضغط مع شهيق بطيء وعميق ➔ كتم النفس 10 ثوانٍ ➔ مضمضة بالماء وبصقه؛ وتأكد من توفر فنتولين دائم في متناول يده للطوارئ.';
  }

  // -------------------------------------------------------------
  // 15. ANTIHISTAMINES & ALLERGY (Zyrtec, Cetirizine, Xyzal, Levocetirizine, Aerius, Desloratadine, Claritine, Loratadine, Telfast, Fexofenadine, Histafen)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('zyrtec') ||
    fullSearch.includes('cetirizine') ||
    fullSearch.includes('xyzal') ||
    fullSearch.includes('aerius') ||
    fullSearch.includes('desloratadine') ||
    fullSearch.includes('claritine') ||
    fullSearch.includes('loratadine') ||
    fullSearch.includes('telfast') ||
    fullSearch.includes('fexofenadine') ||
    fullSearch.includes('histafen')
  ) {
    usageTiming = 'قرص واحد يومياً. يُفضل أخذ الزيرتك والسيزال مساءً لاحتمال تسبيبهما نعاساً خفيفاً، بينما التلفاست والأيريوس يؤخذان صباحاً كخيار لا يسبب النعاس تماماً (Non-Sedating).';
    commonErrors = [
      'تناول التلفاست (Fexofenadine) مع عصائر الفواكه الحمضية (الجريب فروت، البرتقال، التفاح) مما يثبط ناقل OATP1A2 ويقلل امتصاصه بنسبة 70%.',
      'قيادة السيارة أو العمل على آلات دقيقة عند تجربة مضادات الهيستامين لأول مرة.'
    ];
    interactions = [
      'المهدئات ومضادات الاكتئاب والكحول تضاعف التأثير المثبط للجهاز العصبي المركزي.',
      'مضادات الحموضة المحتوية على الألمنيوم والمغنيسيوم تقلل امتصاص التلفاست (فصل ساعتين).'
    ];
    lifestyleAdvice = [
      'تناول دواء التلفاست بالماء النقي فقط وتجنب العصائر الحمضية قبل الجرعة وبعدها بساعتين.',
      'تجنب التعرض للمهيجات ومسببات الحساسية وغسل الوجه والأنف بمحلول ملحي متعادل.'
    ];
    goldenCounselingTip = 'التلفاست والأيريوس هما الخيار المثالي للطلاب والسائقين لعدم عبورهما الحاجز الدماغي، واحرص على تنبيه مستخدم التلفاست ببلع الحبة بالماء فقط والابتعاد عن عصائر الفواكه.';
  }

  // -------------------------------------------------------------
  // 16. NASAL DECONGESTANTS (Otrivin, Iliadin, Xylometazoline, Oxymetazoline)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('otrivin') ||
    fullSearch.includes('iliadin') ||
    fullSearch.includes('xylometazoline') ||
    fullSearch.includes('oxymetazoline')
  ) {
    usageTiming = 'بخة إلى بختين في كل منخر مرتين إلى 3 مرات يومياً، لمدة قصوى لا تتجاوز 3 إلى 5 أيام متتالية فقط.';
    commonErrors = [
      'الاستمرار في استخدام البخاخ لأكثر من 5 أيام مما يسبب انسداداً ارتدادياً مزمناً والتهاب الأنف الدوائي التعودي (Rhinitis Medicamentosa).',
      'استخدامه المفرط لمرضى الضغط المرتفع غير المنضبط أو المياه الزرقاء (Glaucoma).'
    ];
    interactions = [
      'الحذر مع مثبطات MAOIs ومضادات الاكتئاب ثلاثية الحلقات نظراً لخطر نوبات ارتفاع الضغط الحادة.'
    ];
    lifestyleAdvice = [
      'تنظيف الأنف ببخاخ ماء البحر الملحي (Isotonic/Hypertonic Saline) كبديل آمن وطبيعي للاستخدام اليومي المستمر.',
      'التبديل إلى بخاخات الكورتيزون الأنفية (مثل Flixonase, Nasonex) في حالات الحساسية الموسمية المزمنة.'
    ];
    goldenCounselingTip = 'حذر المريض بلهجة حازمة ألا يتجاوز 5 أيام إطلاقاً لتجنب الإدمان والانسداد الدائم للأنف، وانصحه بالاعتماد على بخاخات ماء البحر الطبيعية للتنظيف المستمر.';
  }

  // -------------------------------------------------------------
  // 17. SUPPLEMENTS & MINERALS (Iron, Calcium, Vitamin D3, B12, Zinc, Magnesium, Osteocare, Feroglobin, Neurobion)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('iron') ||
    fullSearch.includes('ferro') ||
    fullSearch.includes('calcium') ||
    fullSearch.includes('osteocare') ||
    fullSearch.includes('feroglobin') ||
    fullSearch.includes('vitamin d') ||
    fullSearch.includes('neurobion') ||
    fullSearch.includes('magnesium') ||
    fullSearch.includes('zinc') ||
    fullSearch.includes('folic acid')
  ) {
    usageTiming = 'الحديد: على معدة فارغة أو مع Vitamin C لتعزيز الامتصاص. الكالسيوم وفيتامين D: مع وجبة دهنية دسمة. المغنيسيوم: مساءً قبل النوم لاسترخاء العضلات.';
    commonErrors = [
      'تناول حبوب الحديد مع الشاي، القهوة، الحليب، أو الكالسيوم مما يرسب الحديد ويبطل امتصاصه كلياً.',
      'تناول فيتامين D على معدة فارغة دون وسط دهني، مما يقلل امتصاص هذا الفيتامين الذائب بالدهون بنسبة النصف.'
    ];
    interactions = [
      'الحديد والكالسيوم يقللان امتصاص المضادات الحيوية (Tetracyclines, Quinolones) وهرمون الغدة (Eltroxin)؛ يجب الفصل 2-4 ساعات.',
      'الزنك والحديد يتنافسان على نفس النواقل الامتصاصية في الأمعاء الدقيقة.'
    ];
    lifestyleAdvice = [
      'شرب عصير برتقال طازج مع حبة الحديد، وتوقع تحول لون البراز إلى الأسود وهو عرض طبيعي تماماً.',
      'فحص مستويات مخزون الحديد (Ferritin) وفيتامين D3 دورياً للوصول للجرعة الوقائية المناسبة.'
    ];
    goldenCounselingTip = 'افصل بين حبة الحديد وكوب الشاي أو الحليب بساعتين على الأقل، وانصح بتناول فيتامين D مع وجبة الغداء الدسمة، والمغنيسيوم ليلاً لنوم هادئ واسترخاء عضلي.';
  }

  // -------------------------------------------------------------
  // 18. GASTROINTESTINAL & ANTISPASMODICS (Duspatalin, Mebeverine, Buscopan, Spasfon, Motilium, Domperidone, Gaviscon)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('duspatalin') ||
    fullSearch.includes('mebeverine') ||
    fullSearch.includes('buscopan') ||
    fullSearch.includes('spasfon') ||
    fullSearch.includes('motilium') ||
    fullSearch.includes('domperidone') ||
    fullSearch.includes('gaviscon')
  ) {
    usageTiming = 'الدوسباتالين (Mebeverine): قبل الوجبات بـ 20 دقيقة مع بلع القرص كاملاً. الموتيليوم: قبل الأكل بـ 15-30 دقيقة. الجافيسكون: بعد الوجبات وقبل النوم مباشرة.';
    commonErrors = [
      'مضغ أو سحق كبسولات الدوسباتالين أو تناول مضادات التقلص بعد الوجبة بعد حدوث المغص الفعلي.',
      'استخدام الدومبيريدون (Motilium) لمرضى القلب وكبار السن بجرعات عالية دون تخطيط قلب (خطر استطالة QT Interval).'
    ];
    interactions = [
      'الجافيسكون ومضادات الحموضة يجب فصلها ساعتين عن الأدوية الأخرى لأنها تقلل امتصاصها.',
      'البوسكوبان يفاقم أعراض تضخم البروستاتا الحميد والمياه الزرقاء المغلقة الزاوية.'
    ];
    lifestyleAdvice = [
      'تنظيم مواعيد الوجبات وتقليل الأغذية المخمرة المسببة للغازات (FODMAPs) لمرضى القولون العصبي.',
      'عدم شرب السوائل بكثرة أثناء تناول حبوب الجافيسكون للمحافظة على الطبقة الطافية الرغوية في أعلى المعدة.'
    ];
    goldenCounselingTip = 'انصح مريض القولون بأخذ الدوسباتالين بانتظام قبل الأكل بـ 20 دقيقة للوقاية من التقلصات، والجافيسكون بعد الأكل كحاجز فيزيائي فوري يمنع حرقة المريء.';
  }

  // -------------------------------------------------------------
  // 19. TOPICALS & DERMATOLOGY (Fucidin, Fucicort, Daktacort, Betnovate, Differin, Adapalene, Skinoren)
  // -------------------------------------------------------------
  else if (
    fullSearch.includes('fucidin') ||
    fullSearch.includes('fucicort') ||
    fullSearch.includes('daktacort') ||
    fullSearch.includes('betnovate') ||
    fullSearch.includes('differin') ||
    fullSearch.includes('adapalene') ||
    fullSearch.includes('skinoren') ||
    form.includes('cream') ||
    form.includes('ointment') ||
    form.includes('gel')
  ) {
    usageTiming = 'تطبيق طبقة رقيقة جداً على المنطقة المصابة فقط. مشتقات الرتينويد (Differin) مساءً فقط في الظلام، مع غسل اليدين جيداً قبل وبعد الاستخدام.';
    commonErrors = [
      'استخدام كريمات الكورتيزون القوية (مثل Fucicort, Betnovate) على الوجه أو المناطق الحساسة لفترات طويلة مما يسبب ضمور الجلد وظهور الشعيرات الدموية (Telangiectasia).',
      'التعرض المباشر لأشعة الشمس أثناء علاج حب الشباب بالدفرين أو السكينورين دون واقي شمس.'
    ];
    interactions = [
      'تجنب استخدام المقشرات الكيميائية القوية والصابون المعطر مع مشتقات الريتينويد لمنع التهاب الجلد التماسي.'
    ];
    lifestyleAdvice = [
      'استخدام مقياس وحدة طرف الإصبع (Fingertip Unit) لتقدير كمية الكريم بدقة دون إفراط.',
      'الترطيب الطبي الخالي من العطور واستخدام واقي شمس واسع الطيف SPF 50+ يومياً.'
    ];
    goldenCounselingTip = 'كريمات الكورتيزون لا تُستخدم أكثر من 7 أيام على الوجه لتجنب ترقق الجلد، والدفرين يوضع ليلاً بحجم حبة البازلاء فقط مع ضرورة واقي الشمس نهاراً.';
  }

  // -------------------------------------------------------------
  // 20. ADVANCED CLINICAL FALLBACK BY PHARMACOLOGICAL STEM & DOSAGE FORM
  // -------------------------------------------------------------
  else {
    let formDetails = 'يُؤخذ بانتظام بالجرعة المقررة مع كوب ماء وفير (250 مل).';
    if (form.includes('susp') || form.includes('syrup') || form.includes('liquid') || fullSearch.includes('sospension') || fullSearch.includes('syrup')) {
      formDetails = 'يُرج المحلول/المعلق جيداً قبل كل جرعة لضمان تجانس المادة الفعالة، مع استخدام المكيال المدرج المرفق بدقة.';
    } else if (form.includes('drop') || fullSearch.includes('drops')) {
      formDetails = 'تُقطر الجرعة المقررة مع إغلاق العين/الأذن دقيقة وتجنب ملامسة فوهة القطارة للأنسجة لضمان التعقيم.';
    } else if (form.includes('efferv') || fullSearch.includes('fizz') || fullSearch.includes('sachet')) {
      formDetails = 'يُذاب الفوار/الكيس بالكامل في نصف كوب ماء ويُشرب مباشرة بعد توقف الفوران.';
    }

    usageTiming = `${formDetails} مع مراعاة تناوله في نفس الموعد يومياً للمحافظة على تركيز ثابت بالدم.`;
    commonErrors = [
      'تخطي الجرعات أو مضاعفتها عند نسيان الجرعة السابقة دون استشارة الصيدلي.',
      'حفظ الدواء في الحمام أو المطبخ حيث تؤدي الرطوبة والحرارة لتكسير الروابط الكيميائية الفعالة.'
    ];
    interactions = [
      'استشارة الصيدلي دائماً عند إضافة أي مكمل غذائي، عشبي، أو مسكن لتجنب التداخلات الحركية والديناميكية (PK/PD Interactions).'
    ];
    lifestyleAdvice = [
      'الالتزام بالتعليمات الصيدلانية الدقيقة وقراءة النشرة الداخلية للتعرف على التحذيرات الخاصة.',
      'شرب كميات كافية من الماء للمحافظة على التوازن الكلوي والكبدي أثناء استقلاب الدواء.'
    ];
    goldenCounselingTip = 'احرص على سؤال المريض عن تاريخه المرضي ووظائف الكلى والكبد والأدوية المزمنة، وتأكد من حفظ الدواء في درجة حرارة أقل من 25 مئوية بعيداً عن الرطوبة.';
  }

  // Construct formatted WhatsApp message
  const fullMessageText = `🌿 *كبسولة صيدلية بيتك الدوائية • تدريب وتطوير* 💊✨
━━━━━━━━━━━━━━━━━━━
👤 مرحباً بك يا *{name}* في فقرة التدريب الصيدلاني الدوري!
📦 الصنف: *${name}* ${sciName ? `(${sciName})` : ''}
━━━━━━━━━━━━━━━━━━━
🎯 *1. التوقيت والاستخدام المثالي:*
• ${usageTiming}

⚠️ *2. أشهر الأخطاء الشائعة عند المرضى:*
${commonErrors.map((e) => `• ${e}`).join('\n')}

🚫 *3. التداخلات الدوائية والغذائية الحرجة:*
${interactions.map((i) => `• ${i}`).join('\n')}

🌟 *4. نصائح وسلوكيات لرفع فعالية العلاج:*
${lifestyleAdvice.map((a) => `• ${a}`).join('\n')}

💡 *5. النصيحة الذهبية للصيدلي عند الصرف:*
• ${goldenCounselingTip}
━━━━━━━━━━━━━━━━━━━
🌿 *صيدلية بيتك.. رعاية صيدلانية متكاملة بمعايير عالمية!* ✨`;

  return {
    productName: name,
    scientificName: sciName,
    usageTiming,
    commonErrors,
    interactions,
    lifestyleAdvice,
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
