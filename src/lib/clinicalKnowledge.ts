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
 * Analyzes product properties and active ingredients to generate comprehensive clinical counseling guidance.
 */
export function generateClinicalCapsule(product: ClinicalProductInput): ClinicalCapsuleData {
  const name = (product.name || '').trim();
  const sciName = (product.scientificName || '').trim();
  const fullSearch = `${name} ${sciName}`.toLowerCase();
  const form = (product.dosageForm || '').toLowerCase();

  let usageTiming = 'يُؤخذ بالجرعة المقررة بانتظام مع كوب ماء كامل (250 مل).';
  let commonErrors: string[] = [];
  let interactions: string[] = [];
  let lifestyleAdvice: string[] = [];
  let goldenCounselingTip = 'احرص على سؤال المريض عن أي أدوية مزمنة أخرى يتناولها لضمان عدم وجود تداخلات خفية.';

  // 1. Proton Pump Inhibitors (PPIs) - Omeprazole, Pantoprazole, Esomeprazole, Lansoprazole
  if (fullSearch.includes('prazole') || fullSearch.includes('omep') || fullSearch.includes('panto') || fullSearch.includes('esom') || fullSearch.includes('controloc') || fullSearch.includes('nexium') || fullSearch.includes('losec')) {
    usageTiming = 'يُؤخذ على معدة فارغة تماماً قبل وجبة الإفطار بـ 30 إلى 60 دقيقة يومياً.';
    commonErrors = [
      'تناول الحبة بعد الأكل أو مع الوجبة، مما يقلل امتصاصها وفعاليتها بنسبة تتجاوز 50%.',
      'كسر أو سحق أو مضغ الكبسولة/الحبة المغلفة معوياً (Enteric Coated).'
    ];
    interactions = [
      'يقلل امتصاص الحديد وفيتامين B12 والكالسيوم عند الاستخدام لفترات طويلة.',
      'يتداخل الأوميبرازول مع دواء السيولة بلافيكس (Clopidogrel)، ويفضل استخدام البانتوبرازول كبديل آمن.'
    ];
    lifestyleAdvice = [
      'تجنب الاستلقاء أو النوم مباشرة بعد تناول الوجبات (الانتظار ساعتين على الأقل).',
      'تقليل المشروبات الغازية، القهوة، والأطعمة الدسمة والحارة لتعزيز سرعة تعافي جدار المعدة.'
    ];
    goldenCounselingTip = 'انصح المريض ببلع الحبة كاملة صباحاً قبل الفطور بنصف ساعة، وألا يتوقف عن الدواء بمجرد زوال الحموضة لضمان التئام المعدة.';
  }
  // 2. Metformin & Antidiabetics
  else if (fullSearch.includes('metformin') || fullSearch.includes('glucophage') || fullSearch.includes('gluco') || fullSearch.includes('diamicron') || fullSearch.includes('jardiance') || fullSearch.includes('forxiga') || fullSearch.includes('januvia') || fullSearch.includes('galvus')) {
    usageTiming = 'يُؤخذ مع الوجبة الرئيسية أو مباشرة بعدها لتقليل اضطرابات الجهاز الهضمي.';
    commonErrors = [
      'أخذ الدواء على معدة فارغة مما يسبب غثياناً وإسهالاً وتقلصات بطنية.',
      'إيقاف الدواء تلقائياً عند رؤية قراءة سكر طبيعية ظناً أن المرض قد شُفي.'
    ];
    interactions = [
      'يجب إيقاف الميتفورمين مؤقتاً قبل 48 ساعة من إجراء الفحوصات الإشعاعية بالصبغة الملونة (Iodinated Contrast).',
      'الحذر من تناول الكحول لتجنب خطر الحماض اللبني (Lactic Acidosis).'
    ];
    lifestyleAdvice = [
      'الالتزام بشرب كميات وافرة من الماء يومياً للمحافظة على وظائف الكلى.',
      'فحص مستوى فيتامين B12 دورياً، حيث قد يقلل الميتفورمين من امتصاصه مع السنوات.'
    ];
    goldenCounselingTip = 'أكد للمريض أن اضطرابات المعدة في البداية طبيعية وستزول تدريجياً إذا التزم بتناول الدواء في منتصف أو نهاية الوجبة.';
  }
  // 3. Statins / Cholesterol - Atorvastatin, Rosuvastatin, Simvastatin
  else if (fullSearch.includes('statin') || fullSearch.includes('lipitor') || fullSearch.includes('crestor') || fullSearch.includes('ator') || fullSearch.includes('rosu')) {
    usageTiming = 'يُفضل تناوله مساءً أو قبل النوم (حيث ينشط تصنيع الكوليسترول في الكبد ليلاً).';
    commonErrors = [
      'إيقاف الدواء بمجرد انخفاض الكوليسترول بالتحليل دون استشارة الطبيب.',
      'تجاهل آلام العضلات الشديدة وغير المعتادة دون إبلاغ الصيدلي أو الطبيب.'
    ];
    interactions = [
      'تجنب تناول فاكهة أو عصير الجريب فروت (Grapefruit) تماماً لأنه يرفع تركيز الدواء بالدم ويزيد سميته.',
      'الحذر من التزامن مع بعض المضادات الحيوية مثل الكلاريثروميسين (Clarithromycin).'
    ];
    lifestyleAdvice = [
      'اتباع حمية قليلة الدهون المشبعة وممارسة المشي اليومي لتعزيز رفع الكوليسترول النافع HDL.',
      'إجراء فحص دوري لإنزيمات الكبد ووظائف العضلات (CK).'
    ];
    goldenCounselingTip = 'ذكّر المريض أن أدوية الكوليسترول تحمي الشرايين والقلب على المدى الطويل وليست مجرد خافض مؤقت للدهون.';
  }
  // 4. Antibiotics - Amoxicillin, Augmentin, Azithromycin, Ciprofloxacin, Cefixime
  else if (fullSearch.includes('amox') || fullSearch.includes('clav') || fullSearch.includes('augmentin') || fullSearch.includes('azithro') || fullSearch.includes('cipro') || fullSearch.includes('cefix') || fullSearch.includes('curam') || fullSearch.includes('klacid') || fullSearch.includes('zithro')) {
    usageTiming = 'الالتزام الصارم بمواعيد الجرعات بفواصل زمنية متساوية (كل 8 ساعات أو كل 12 ساعة بدقة).';
    commonErrors = [
      'إيقاف المضاد الحيوي بمجرد الشعور بالتحسن، مما يؤدي لعودة البكتيريا بمناعة ومقاومة أشرس.',
      'تكرار المضاد الحيوي تلقائياً عند كل نوبة رشح أو إنفلونزا فيروسية دون داعٍ.'
    ];
    interactions = [
      'أدوية السيبروفلوكساسين والدوكسيسيكلين تتفاعل مع مشتقات الألبان والكالسيوم والحديد؛ يجب المباعدة ساعتين.',
      'المباعدة ساعتين على الأقل بين المضاد الحيوي ومكملات البروبيوتيك (بكتيريا الأمعاء النافعة).'
    ];
    lifestyleAdvice = [
      'شرب كميات كافية من السوائل طوال فترة العلاج للمساعدة في طرح الدواء وتجنب ترسبه بالكلى.',
      'تناول الأوجمنتين مع بداية الأكل لتقليل الغثيان والإسهال.'
    ];
    goldenCounselingTip = 'أكد بحزم على ضرورة إكمال الكورس العلاجي بالكامل حتى آخر حبة لحماية المريض والمجتمع من مقاومة المضادات الحيوية.';
  }
  // 5. NSAIDs & Painkillers - Ibuprofen, Diclofenac, Naproxen, Meloxicam, Ketoprofen
  else if (fullSearch.includes('profen') || fullSearch.includes('diclo') || fullSearch.includes('voltaren') || fullSearch.includes('cataflam') || fullSearch.includes('naproxen') || fullSearch.includes('mobic') || fullSearch.includes('panadol') || fullSearch.includes('paracetamol')) {
    usageTiming = 'يُؤخذ بعد الأكل مباشرة مع كوب ماء كبير، وتجنب الاستلقاء بعده لمدة 15 دقيقة.';
    commonErrors = [
      'تناول المسكن على معدة فارغة مما قد يسبب تقرحات ونزيفاً معدياً.',
      'الجمع بين أكثر من مسكن من عائلة NSAIDs في نفس الوقت (مثل بروفين مع فولتارين).'
    ];
    interactions = [
      'يتعارض مع أدوية السيولة (الأسبرين، الوارفارين) ويزيد خطر النزيف بشكل كبير.',
      'يقلل من فعالية أدوية الضغط ومدرات البول ويزيد الضغط على وظائف الكلى.'
    ];
    lifestyleAdvice = [
      'استخدام أقل جرعة فعالة ولأقصر فترة ممكنة فقط عند اللزوم.',
      'مرضى الضغط وقرحة المعدة والربو يجب عليهم الحذر الشديد واختيار الباراسيتامول كخيار أول.'
    ];
    goldenCounselingTip = 'انصح المريض دائماً بأخذ المسكن بعد وجبة مشبعة، ولا تصرف مضادات الالتهاب لمرضى القرحة أو القصور الكلوي دون بديل آمن.';
  }
  // 6. Inhalers & Respiratory (Asthma & COPD)
  else if (fullSearch.includes('inhaler') || fullSearch.includes('ventolin') || fullSearch.includes('symbicort') || fullSearch.includes('seretide') || fullSearch.includes('foster') || fullSearch.includes('salbutamol') || form.includes('inhal')) {
    usageTiming = 'يُستخدم وفق التوجيه الطبي، مع رج البخاخ جيداً قبل كل استخدام والانتظار دقيقة بين البخات.';
    commonErrors = [
      'عدم غسل والمضمضة بالماء بعد استخدام بخاخات الكورتيزون، مما يسبب فطريات الفم وبحة الصوت.',
      'البخ السريع واستنشاق الدواء دون كتم النفس لمدة 5 إلى 10 ثوانٍ في الرئتين.'
    ];
    interactions = [
      'تجنب أدوية الضغط من فئة حاصرات بيتا غير الانتقائية (مثل البروبرانولول) لأنها تسبب تضيقاً بالشعب الهوائية.'
    ];
    lifestyleAdvice = [
      'تنظيف القطعة الفموية للبخاخ بانتظام بالماء الدافئ وتجفيفها جيداً.',
      'استخدام الموسع سريع المفعول (مثل الفنتولين) أولاً، ثم الانتظار 5 دقائق قبل بخاخ الكورتيزون لضمان وصوله لأعمق نقطة بالرئة.'
    ];
    goldenCounselingTip = 'علّم المريض طريقة الاستنشاق الصحيحة: إخراج الزفير كاملاً، ثم أخذ البخة مع شهيق عميق وبطيء وكتم النفس 10 ثوانٍ، والمضمضة بعدها فوراً.';
  }
  // 7. Iron & Supplements
  else if (fullSearch.includes('iron') || fullSearch.includes('ferro') || fullSearch.includes('calcium') || fullSearch.includes('osteocare') || fullSearch.includes('feroglobin')) {
    usageTiming = 'الحديد: على معدة فارغة أو مع فيتامين C لزيادة الامتصاص. الكالسيوم: مع الأكل.';
    commonErrors = [
      'تناول مكملات الحديد مع الشاي، القهوة، أو الحليب ومشتقاته مما يبطل امتصاصه تماماً.',
      'الجمع بين حبوب الحديد والكالسيوم في نفس التوقيت (يجب الفصل 2-3 ساعات بينهما).'
    ];
    interactions = [
      'يقلل الحديد والكالسيوم من امتصاص هرمون الغدة الدرقية (Eltroxin) والمضادات الحيوية.'
    ];
    lifestyleAdvice = [
      'تناول كوب عصير برتقال طازج مع حبة الحديد لتعزيز امتصاصه للضعف.',
      'توقع تغيّر لون الخروج إلى الأسود مع الحديد، وهو أمر طبيعي تماماً وغير مقلق.'
    ];
    goldenCounselingTip = 'نبّه المريض للفصل بين حبة الحديد وفنجان الشاي أو القهوة بساعتين على الأقل لضمان الاستفادة الكاملة من العلاج.';
  }
  // 8. General / Fallback based on Dosage Form
  else {
    usageTiming = 'يُؤخذ بانتظام وفق الجرعة الموصوفة، مع حفظ الدواء في مكان بارد وجاف بعيداً عن الرطوبة والشمس.';
    commonErrors = [
      'عدم الالتزام بالتوقيت اليومي المحدد للدواء.',
      'حفظ الأدوية في الحمام أو المطبخ حيث تؤدي الرطوبة والحرارة لتلف المادة الفعالة.'
    ];
    interactions = [
      'استشارة الصيدلي دائماً عند إضافة أي مكمل غذائي أو دواء جديد لتجنب التداخلات.'
    ];
    lifestyleAdvice = [
      'قراءة النشرة الداخلية والالتزام بتعليمات الصيدلي.',
      'شرب كميات كافية من الماء للمحافظة على استقرار الدواء بالجسم.'
    ];
    goldenCounselingTip = 'احرص على تذكير المريض بأهمية الالتزام بمواعيد الجرعات وتخزين الدواء في درجة حرارة أقل من 25 درجة مئوية.';
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
  { id: '1', name: 'Nexium 40mg Tab (Esomeprazole)', scientificName: 'Esomeprazole 40mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 24, sellPrice: 48.0 },
  { id: '2', name: 'Glucophage 500mg (Metformin)', scientificName: 'Metformin HCl 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 35, sellPrice: 15.5 },
  { id: '3', name: 'Lipitor 20mg (Atorvastatin)', scientificName: 'Atorvastatin 20mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 18, sellPrice: 52.0 },
  { id: '4', name: 'Augmentin 1g Tab (Amoxicillin/Clavulanate)', scientificName: 'Amoxicillin + Clavulanic Acid 1g', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 42, sellPrice: 38.0 },
  { id: '5', name: 'Ventolin Inhaler 100mcg (Salbutamol)', scientificName: 'Salbutamol Inhaler', dosageForm: 'Inhaler', category: 'MEDICINES', stockOnHand: 30, sellPrice: 22.0 },
  { id: '6', name: 'Concor 5mg (Bisoprolol)', scientificName: 'Bisoprolol Fumarate 5mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 28, sellPrice: 26.0 },
  { id: '7', name: 'Voltaren 50mg (Diclofenac Sodium)', scientificName: 'Diclofenac Sodium 50mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 50, sellPrice: 18.0 },
  { id: '8', name: 'Symbicort Turbuhaler 160/4.5mcg', scientificName: 'Budesonide + Formoterol', dosageForm: 'Inhaler', category: 'MEDICINES', stockOnHand: 12, sellPrice: 95.0 },
  { id: '9', name: 'Panadol Extra Tab (Paracetamol + Caffeine)', scientificName: 'Paracetamol 500mg + Caffeine 65mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 65, sellPrice: 12.0 },
  { id: '10', name: 'Osteocare Plus Omega-3 (Vitabiotics)', scientificName: 'Calcium + Magnesium + Vit D3 + Zinc', dosageForm: 'Tablets', category: 'SUPPLEMENTS', stockOnHand: 22, sellPrice: 45.0 },
  { id: '11', name: 'Feroglobin B12 Capsules', scientificName: 'Iron + Zinc + B-Complex + Folic Acid', dosageForm: 'Capsules', category: 'SUPPLEMENTS', stockOnHand: 19, sellPrice: 36.0 },
  { id: '12', name: 'Klacid 500mg Tab (Clarithromycin)', scientificName: 'Clarithromycin 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 14, sellPrice: 62.0 },
  { id: '13', name: 'Eltroxin 50mcg (Levothyroxine)', scientificName: 'Levothyroxine Sodium 50mcg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 20, sellPrice: 18.0 },
  { id: '14', name: 'Cataflam 50mg (Diclofenac Potassium)', scientificName: 'Diclofenac Potassium 50mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 40, sellPrice: 19.5 },
  { id: '15', name: 'Zithromax 500mg (Azithromycin)', scientificName: 'Azithromycin 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 16, sellPrice: 42.0 },
  { id: '16', name: 'Jardiance 10mg (Empagliflozin)', scientificName: 'Empagliflozin 10mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 15, sellPrice: 140.0 },
  { id: '17', name: 'Crestor 10mg (Rosuvastatin)', scientificName: 'Rosuvastatin 10mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 17, sellPrice: 68.0 },
  { id: '18', name: 'Controloc 40mg (Pantoprazole)', scientificName: 'Pantoprazole 40mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 25, sellPrice: 44.0 },
  { id: '19', name: 'Brufen 400mg (Ibuprofen)', scientificName: 'Ibuprofen 400mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 55, sellPrice: 14.0 },
  { id: '20', name: 'Neurobion Forte Coated Tab', scientificName: 'Vitamin B1 + B6 + B12', dosageForm: 'Tablets', category: 'SUPPLEMENTS', stockOnHand: 32, sellPrice: 28.0 }
];

