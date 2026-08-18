export interface ClinicalProductInput {
  id?: string | number;
  name: string;
  scientificName?: string;
  dosageForm?: string;
  category?: string;
  stockOnHand?: number;
  costPrice?: number;
  sellPrice?: number;
  barcode?: string;
  productCode?: string;
  activeIngredient?: string;
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
 * محرك استخراج التركيبة الكيميائية النقية (Active Chemical Molecule Extractor)
 * يحلل اسم الدواء ويستخرج المواد الفعالة بدقة ويتجاهل أسماء الشركات والجرعات واللغات الإيطالية/الفرنسية
 */
export function extractActiveChemicalMolecule(name: string, sciName?: string): {
  normalizedChemicalName: string;
  detectedClass: string;
  drugBankId: string;
  drugBankUrl: string;
} {
  const raw = `${sciName || ''} ${name || ''}`.toLowerCase();

  // تنظيف المصطلحات الملحقة
  const cleanRaw = raw
    .replace(/[0-9]+(\.[0-9]+)?\s*(mg|g|mcg|ml|iu|%)/gi, ' ')
    .replace(/\b(kabi|france|novartis|gsk|pfizer|sanofi|hikma|tab|tablets|suspension|sospension|capsule|capsules|inhaler|syrup|drops|spray|vial|amp|retard|forte|coated|plus|extra|hcl|sodium|potassium|fumarate|maleate|calcium|magnesium)\b/gi, ' ')
    .replace(/[^\w\s/+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Amoxicillin + Clavulanic Acid (Co-amoxiclav)
  if (
    raw.includes('amoxicil') ||
    raw.includes('amoxicillina') ||
    raw.includes('clavulanic') ||
    raw.includes('clavulanico') ||
    raw.includes('augmentin') ||
    raw.includes('curam') ||
    raw.includes('megamox') ||
    raw.includes('klavox') ||
    raw.includes('julmentin') ||
    raw.includes('amoclan')
  ) {
    return {
      normalizedChemicalName: 'Amoxicillin + Clavulanic Acid',
      detectedClass: 'مضاد حيوي واسع المجال (Penicillin + Beta-Lactamase Inhibitor)',
      drugBankId: 'DB01060',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01060'
    };
  }

  // 2. Cold & Flu Triple Combinations (123, Congestal, Comtrex, Flutab)
  if (
    raw.includes('123') ||
    raw.includes('1 2 3') ||
    raw.includes('congestal') ||
    raw.includes('comtrex') ||
    raw.includes('flutab') ||
    raw.includes('cold & flu') ||
    raw.includes('cold and flu') ||
    raw.includes('decancit') ||
    raw.includes('c-cold')
  ) {
    return {
      normalizedChemicalName: 'Paracetamol + Pseudoephedrine HCl + Chlorpheniramine Maleate',
      detectedClass: 'مركب علاج نزلات البرد والاحتقان (Analgesic + Decongestant + Antihistamine)',
      drugBankId: 'DB00316',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00316'
    };
  }

  // 3. Nimesulide
  if (raw.includes('nimesulide') || raw.includes('aulin') || raw.includes('mesulid')) {
    return {
      normalizedChemicalName: 'Nimesulide (NSAID)',
      detectedClass: 'مسكن ومضاد التهاب غير ستيرويدي انتقائي (COX-2 Selective NSAID)',
      drugBankId: 'DB00465',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00465'
    };
  }

  // 4. Paracetamol / Acetaminophen
  if (
    raw.includes('paracetamol') ||
    raw.includes('paracetamolo') ||
    raw.includes('panadol') ||
    raw.includes('adol') ||
    raw.includes('acetaminophen') ||
    raw.includes('calpol') ||
    raw.includes('cetal')
  ) {
    const isPlusCaffeine = raw.includes('extra') || raw.includes('caffein') || raw.includes('plus');
    return {
      normalizedChemicalName: isPlusCaffeine ? 'Paracetamol + Caffeine' : 'Paracetamol (Acetaminophen)',
      detectedClass: 'مسكن للآلام وخافض للحرارة (Analgesic & Antipyretic)',
      drugBankId: 'DB00316',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00316'
    };
  }

  // 5. Diclofenac (Sodium / Potassium)
  if (raw.includes('diclofenac') || raw.includes('voltaren') || raw.includes('cataflam') || raw.includes('diclogesic') || raw.includes('declophen')) {
    return {
      normalizedChemicalName: 'Diclofenac (Sodium / Potassium)',
      detectedClass: 'مضاد التهاب ومسكن روماتيزمي (NSAID)',
      drugBankId: 'DB01097',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01097'
    };
  }

  // 6. Ibuprofen & Ketoprofen
  if (raw.includes('ibuprofen') || raw.includes('ibuprofene') || raw.includes('brufen') || raw.includes('advil')) {
    return {
      normalizedChemicalName: 'Ibuprofen',
      detectedClass: 'مسكن للألم ومضاد للالتهاب (NSAID)',
      drugBankId: 'DB01050',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01050'
    };
  }
  if (raw.includes('ketoprofen') || raw.includes('ketofan') || raw.includes('profid') || raw.includes('bi-profid')) {
    return {
      normalizedChemicalName: 'Ketoprofen',
      detectedClass: 'مسكن ومضاد للالتهاب قوي (NSAID)',
      drugBankId: 'DB01009',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01009'
    };
  }

  // 7. Proton Pump Inhibitors (Esomeprazole, Pantoprazole, Omeprazole)
  if (raw.includes('esomeprazol') || raw.includes('nexium')) {
    return {
      normalizedChemicalName: 'Esomeprazole Magnesium',
      detectedClass: 'مثبط مضخة البروتون لعلاج الحموضة والارتجاع (PPI)',
      drugBankId: 'DB00736',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00736'
    };
  }
  if (raw.includes('pantoprazol') || raw.includes('controloc')) {
    return {
      normalizedChemicalName: 'Pantoprazole Sodium',
      detectedClass: 'مثبط مضخة البروتون الآمن لمرضى القلب (PPI)',
      drugBankId: 'DB00213',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00213'
    };
  }
  if (raw.includes('omeprazol') || raw.includes('losec') || raw.includes('gasec')) {
    return {
      normalizedChemicalName: 'Omeprazole',
      detectedClass: 'مثبط إفراز حمض المعدة (PPI)',
      drugBankId: 'DB00338',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00338'
    };
  }

  // 8. Azithromycin, Clarithromycin & Ciprofloxacin
  if (raw.includes('azithromycin') || raw.includes('azitromicina') || raw.includes('zithromax') || raw.includes('azimax')) {
    return {
      normalizedChemicalName: 'Azithromycin (Macrolide Antibiotic)',
      detectedClass: 'مضاد حيوي ماكروليدي قصير الكورس (Macrolide Antibacterial)',
      drugBankId: 'DB00207',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00207'
    };
  }
  if (raw.includes('clarithromycin') || raw.includes('klacid')) {
    return {
      normalizedChemicalName: 'Clarithromycin',
      detectedClass: 'مضاد حيوي لعلاج جرثومة المعدة والتنفس (Macrolide)',
      drugBankId: 'DB01211',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01211'
    };
  }
  if (raw.includes('ciprofloxacin') || raw.includes('ciprofloxacina') || raw.includes('cipro') || raw.includes('ciprobay')) {
    return {
      normalizedChemicalName: 'Ciprofloxacin HCl',
      detectedClass: 'مضاد حيوي للمسالك البولية والتنفس (Fluoroquinolone)',
      drugBankId: 'DB00537',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00537'
    };
  }
  if (raw.includes('cefixime') || raw.includes('cefixima') || raw.includes('suprax') || raw.includes('magnacef')) {
    return {
      normalizedChemicalName: 'Cefixime (3rd Gen Cephalosporin)',
      detectedClass: 'مضاد حيوي سيفالوسبورين الجيل الثالث (Cephalosporin)',
      drugBankId: 'DB00671',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00671'
    };
  }
  if (raw.includes('metronidazole') || raw.includes('flagyl') || raw.includes('dumazole')) {
    return {
      normalizedChemicalName: 'Metronidazole',
      detectedClass: 'مضاد للبكتيريا اللاهوائية والطفيليات (Nitroimidazole)',
      drugBankId: 'DB00916',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00916'
    };
  }

  // 9. Antihypertensives & Cardiac (Bisoprolol, Amlodipine, Losartan, Atorvastatin)
  if (raw.includes('bisoprolol') || raw.includes('bisoprololo') || raw.includes('concor')) {
    return {
      normalizedChemicalName: 'Bisoprolol Fumarate',
      detectedClass: 'حاصرات بيتا القلبية المنتقاة (Cardioselective Beta-1 Blocker)',
      drugBankId: 'DB00612',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00612'
    };
  }
  if (raw.includes('amlodipine') || raw.includes('norvasc') || raw.includes('amloc')) {
    return {
      normalizedChemicalName: 'Amlodipine Besylate',
      detectedClass: 'حاصرات قنوات الكالسيوم الخافضة للضغط (Calcium Channel Blocker)',
      drugBankId: 'DB00381',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00381'
    };
  }
  if (raw.includes('atorvastatin') || raw.includes('atorvastatina') || raw.includes('lipitor') || raw.includes('ator')) {
    return {
      normalizedChemicalName: 'Atorvastatin Calcium',
      detectedClass: 'مخفض الكوليسترول والدهون الضارة (HMG-CoA Reductase Inhibitor)',
      drugBankId: 'DB01076',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01076'
    };
  }
  if (raw.includes('rosuvastatin') || raw.includes('crestor')) {
    return {
      normalizedChemicalName: 'Rosuvastatin Calcium',
      detectedClass: 'مخفض الكوليسترول عالي الفعالية (Statin)',
      drugBankId: 'DB01098',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01098'
    };
  }

  // 10. Antidiabetics (Metformin, Glimepiride, Januvia)
  if (raw.includes('metformin') || raw.includes('metformina') || raw.includes('glucophage') || raw.includes('cidophage')) {
    return {
      normalizedChemicalName: 'Metformin Hydrochloride',
      detectedClass: 'منظم السكر وحساسية الإنسولين (Biguanide Antidiabetic)',
      drugBankId: 'DB00331',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00331'
    };
  }
  if (raw.includes('glimepiride') || raw.includes('amaryl')) {
    return {
      normalizedChemicalName: 'Glimepiride (Sulfonylurea)',
      detectedClass: 'محفز إفراز الإنسولين للسكري النوع الثاني (Sulfonylurea)',
      drugBankId: 'DB00222',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00222'
    };
  }

  // 11. Antihistamines (Fexofenadine, Desloratadine, Cetirizine)
  if (raw.includes('fexofenadine') || raw.includes('fexofenadina') || raw.includes('telfast')) {
    return {
      normalizedChemicalName: 'Fexofenadine Hydrochloride',
      detectedClass: 'مضاد حساسية لا يسبب النعاس (Non-sedating H1 Antihistamine)',
      drugBankId: 'DB00950',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00950'
    };
  }
  if (raw.includes('desloratadine') || raw.includes('aerius')) {
    return {
      normalizedChemicalName: 'Desloratadine',
      detectedClass: 'مضاد حساسية الجيل الثاني (2nd Gen Antihistamine)',
      drugBankId: 'DB00984',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00984'
    };
  }
  if (raw.includes('cetirizine') || raw.includes('zyrtec')) {
    return {
      normalizedChemicalName: 'Cetirizine Hydrochloride',
      detectedClass: 'مضاد للحساسية والرشح (H1 Antihistamine)',
      drugBankId: 'DB00341',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00341'
    };
  }

  // 12. Anticoagulants (Rivaroxaban, Apixaban)
  if (raw.includes('rivaroxaban') || raw.includes('xarelto')) {
    return {
      normalizedChemicalName: 'Rivaroxaban (Direct Factor Xa Inhibitor)',
      detectedClass: 'مميع دم فموي مباشر للوقاية من الجلطات (DOAC / Factor Xa Inhibitor)',
      drugBankId: 'DB06228',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB06228'
    };
  }

  // 13. General Fallback with Extracted Clean Chemical Query
  const fallbackQuery = cleanRaw.split(/\s+/).slice(0, 2).join(' ') || 'Drug';
  return {
    normalizedChemicalName: sciName || cleanRaw || name,
    detectedClass: 'مركب دوائي علاجي (Pharmacotherapy Agent)',
    drugBankId: '',
    drugBankUrl: `https://go.drugbank.com/unearth/q?query=${encodeURIComponent(fallbackQuery)}`
  };
}

/**
 * المحرك السريري الذكي لصيدلية بيتك (Clinical Pharmacotherapy Engine)
 * يبحث ويعتمد على التركيبة الكيميائية النقية (Chemical & Active Ingredient) بدلاً من الأسماء التجارية
 */
export function generateClinicalCapsule(product: ClinicalProductInput): ClinicalCapsuleData {
  const name = (product.name || '').trim();
  const sciName = (product.scientificName || product.activeIngredient || '').trim();
  const form = (product.dosageForm || '').toLowerCase();

  // استخراج التركيبة الكيميائية وتصنيفها السريري
  const chemicalProfile = extractActiveChemicalMolecule(name, sciName);
  const activeIngredientsEn = chemicalProfile.normalizedChemicalName;
  const therapeuticClass = chemicalProfile.detectedClass;
  const drugBankId = chemicalProfile.drugBankId;
  const drugBankUrl = chemicalProfile.drugBankUrl;

  let indications = '';
  let dosageAndAdmin = '';
  let majorInteractions: string[] = [];
  let warningsAndContraindications: string[] = [];
  let patientCounselingTip = '';

  // -------------------------------------------------------------
  // 1. AMOXICILLIN + CLAVULANIC ACID (Co-amoxiclav)
  // -------------------------------------------------------------
  if (activeIngredientsEn.includes('Amoxicillin')) {
    indications = 'علاج العدوى البكتيرية الحادة في الجهاز التنفسي العلوي والسفلي (التهاب اللوزتين، الجيوب الأنفية، الشعب الهوائية)، الأذن الوسطى، المسالك البولية، والتهابات الأسنان واللثة الجراحية.';
    dosageAndAdmin = '• البالغين: 1000 ملغ (1 غرام) كل 12 ساعة في بداية الوجبة لتقليل اضطرابات الهضم والإسهال.\n• الأطفال: معلق شراب بجرعة 45 إلى 90 ملغ/كغ/يوم مقسمة على جرعتين كل 12 ساعة حسب وزن الطفل بدقة.';
    majorInteractions = [
      '🔴 حبوب منع الحمل الفموية (Oral Contraceptives): يقلل فعالية موانع الحمل؛ يجب استخدام وسيلة إضافية أثناء فترة العلاج.',
      '🔴 مميعات الدم (Warfarin): يرفع مؤشر سيولة الدم (INR) وخطر النزيف بشكل ملحوظ.',
      '🟠 دواء النقرس (Allopurinol): يزيد بشكل كبير من احتمالية حدوث طفح جلدي تحسسي.'
    ];
    warningsAndContraindications = [
      '🚫 ممنوع قطعاً لمرضى حساسية البنسلين ومشتقاته (Penicillin Allergy).',
      '⚠️ الالتزام الصارم بإكمال كامل كورس المضاد الحيوي حتى آخر جرعة لمنع ظهور سلالات بكتيرية مقاومة.'
    ];
    patientCounselingTip = 'تناول الحبة في أول لقمة من وجبة الطعام لتقليل حدوث الإسهال أو ألم المعدة، واستمر في تناول العلاج حتى نهاية الأيام المقررة حتى لو شعرت بالشفاء التام.';
  }

  // -------------------------------------------------------------
  // 2. COLD & FLU COMBINATIONS: 123, Congestal, Comtrex, Flutab
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Pseudoephedrine')) {
    indications = 'تخفيف أعراض نزلات البرد والإنفلونزا الحادة: انسداد واحتقان الأنف، العطاس وسيلان الأنف، الصداع، آلام الجسم والحرارة.';
    dosageAndAdmin = '• البالغين والأطفال فوق 12 سنة: قرص واحد (أو 10 مل شراب) كل 6-8 ساعات بعد الأكل (أقصى حد 3-4 مرات يومياً).\n• الأطفال (6 - 12 سنة): 5 مل شراب 3 مرات يومياً بعد الأكل. لا يُعطى للأطفال دون 6 سنوات إلا بإشراف طبي.';
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
  // 3. PARACETAMOL / ACETAMINOPHEN (Panadol, Adol, Calpol, Cetal)
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Paracetamol')) {
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
  // 4. NSAIDs: NIMESULIDE, DICLOFENAC, IBUPROFEN, KETOPROFEN
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Nimesulide') || activeIngredientsEn.includes('Diclofenac') || activeIngredientsEn.includes('Ibuprofen') || activeIngredientsEn.includes('Ketoprofen')) {
    const isNimesulide = activeIngredientsEn.includes('Nimesulide');
    const isDiclo = activeIngredientsEn.includes('Diclofenac');
    indications = 'تسكين آلام المفاصل والروماتيزم، آلام الأسنان، آلام الدورة الشهرية الحادة، الصداع النصفي والالتهابات العضلية الحادة.';
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
  // 5. PROTON PUMP INHIBITORS (PPIs): Nexium, Controloc, Omeprazole, Pantoprazole
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('prazole') || activeIngredientsEn.includes('Prazole') || activeIngredientsEn.includes('Esomeprazole') || activeIngredientsEn.includes('Pantoprazole') || activeIngredientsEn.includes('Omeprazole')) {
    const isPanto = activeIngredientsEn.includes('Pantoprazole');
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
  // 6. OTHER ANTIBIOTICS: Azithromycin, Cipro, Cefixime, Flagyl
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Azithromycin') || activeIngredientsEn.includes('Ciprofloxacin') || activeIngredientsEn.includes('Cefixime') || activeIngredientsEn.includes('Metronidazole')) {
    const isAzithro = activeIngredientsEn.includes('Azithromycin');
    const isCipro = activeIngredientsEn.includes('Ciprofloxacin');
    indications = 'علاج العدوى البكتيرية الحادة في الجهاز التنفسي والمسالك البولية والتهابات المعدة والأمعاء.';
    dosageAndAdmin = isAzithro
      ? '• 500 ملغ قرص واحد يومياً قبل الأكل بساعة أو بعده بساعتين لمدة 3 إلى 5 أيام متتالية.'
      : isCipro
      ? '• 500 ملغ كل 12 ساعة بعيداً عن مشتقات الحليب والكالسيوم لمدة 5-7 أيام.'
      : '• قرص واحد كل 12 ساعة حسب إرشادات الطبيب المقررة.';
    majorInteractions = [
      '🔴 مكملات الكالسيوم والحديد والحليب: تعطل امتصاص المضادات الفلوروكينولونية والتتراسيكلينية.',
      '🔴 الكحول مع الميترونيدازول (Flagyl): تفاعل خطير يشبه الديسولفيرام (Disulfiram Reaction) غثيان وقيء حاد.'
    ];
    warningsAndContraindications = [
      '⚠️ إكمال كامل الكورس العلاجي حتى بعد زوال الأعراض لمنع مقاومة البكتيريا للمضادات (Antibiotic Resistance).'
    ];
    patientCounselingTip = 'تناول الجرعات في مواعيد دقيقة كل يوم مع شرب كميات وافرة من الماء، ولا تتوقف عن العلاج بمجرد الشعور بالتحسن.';
  }

  // -------------------------------------------------------------
  // 7. ANTIHYPERTENSIVES & CARDIAC (Bisoprolol, Amlodipine, Statins)
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Bisoprolol') || activeIngredientsEn.includes('Amlodipine') || activeIngredientsEn.includes('Atorvastatin') || activeIngredientsEn.includes('Rosuvastatin')) {
    indications = 'علاج ارتفاع ضغط الدم، حماية عضلة القلب والشرايين، خفض الكوليسترول والدهون الضارة، والوقاية من الجلطات والسكتات الدماغية.';
    dosageAndAdmin = '• قرص واحد يومياً في موعد ثابت كل صباح (أو مساءً لأدوية الكوليسترول مثل الستاتينات).';
    majorInteractions = [
      '🔴 المسكنات القوية (NSAIDs): تعاكس التأثير الخافض للضغط وترفع ضغط الدم وتجهد الكلى.',
      '🔴 عصير الجريب فروت (Grapefruit): يثبط إنزيم CYP3A4 ويرفع تركيز أدوية الستاتينات وحاصرات الكالسيوم للحد السام.'
    ];
    warningsAndContraindications = [
      '⚠️ يمنع إيقاف دواء الضغط فجأة دون استشارة الطبيب لتفادي الارتفاع الارتدادي الحاد لضغط الدم.'
    ];
    patientCounselingTip = 'تناول الدواء بانتظام في نفس الموعد كل يوم، وتجنب المسكنات القوية مثل الفولتارين والبروفين دون استشارة الصيدلي.';
  }

  // -------------------------------------------------------------
  // 8. ANTIDIABETICS (Metformin, Glimepiride)
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Metformin') || activeIngredientsEn.includes('Glimepiride')) {
    const isMet = activeIngredientsEn.includes('Metformin');
    indications = 'تنظيم مستويات السكر في الدم، تحسين حساسية الإنسولين، والوقاية من مضاعفات مرض السكري على المدى الطويل.';
    dosageAndAdmin = isMet
      ? '• 500 - 1000 ملغ مرتين إلى 3 مرات يومياً في منتصف أو نهاية الوجبات الرئيسية لتقليل اضطرابات المعدة.'
      : '• قرص واحد يومياً قبل وجبة الإفطار بـ 15 دقيقة مع الالتزام بتناول الطعام.';
    majorInteractions = [
      '🔴 الصبغات الإشعاعية الوريدية (Iodinated Contrast): يجب إيقاف الميتفورمين قبل الأشعة بـ 48 ساعة لمنع الفشل الكلوي الحاد.',
      '🔴 أدوية الكورتيزون: ترفع مستوى السكر بالدم وتعاكس عمل العلاج.'
    ];
    warningsAndContraindications = [
      '⚠️ علامات هبوط السكر (Hypoglycemia): رجفة، تعرق بارد، دوخة، جوع شديد؛ يجب تناول عصير محلى فوراً.'
    ];
    patientCounselingTip = 'تناول حبوب الميتفورمين في منتصف الأكل لتجنب اضطراب المعدة والإسهال، واحتفظ دائماً بقطعة سكر أو عصير للتعامل مع أي هبوط مفاجئ بالسكر.';
  }

  // -------------------------------------------------------------
  // 9. ANTIHISTAMINES & ALLERGY: Fexofenadine, Desloratadine, Cetirizine
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Fexofenadine') || activeIngredientsEn.includes('Desloratadine') || activeIngredientsEn.includes('Cetirizine')) {
    indications = 'علاج حساسية الأنف الموسمية، العطاس وسيلان الأنف، حكة العيون، والشرى الجلدي والارتيكاريا (Urticaria).';
    dosageAndAdmin = '• 120 ملغ أو 180 ملغ قرص واحد يومياً مع كوب ماء.';
    majorInteractions = [
      '🔴 عصائر الفواكه (الجريب فروت، البرتقال مع تيلفاست): تقلل الامتصاص بنسبة 50% (يؤخذ بالماء فقط).',
      '🟠 مضادات الحموضة: باعد ساعتين عن تناول العلاج.'
    ];
    warningsAndContraindications = [
      '✅ جيل حديث آمن جداً ولا يسبب النعاس؛ مناسب لمن يمارسون أعمالاً تتطلب تركيزاً أو قيادة.'
    ];
    patientCounselingTip = 'يُؤخذ قرص واحد يومياً مع الماء فقط وتجنب شربه مع عصير البرتقال لضمان الفعالية التامة.';
  }

  // -------------------------------------------------------------
  // 10. GENERAL CLINICAL SMART FALLBACK (Any other Product)
  // -------------------------------------------------------------
  else {
    let formDetails = 'يُؤخذ بانتظام بالجرعة المقررة مع كوب ماء وفير (250 مل).';
    if (form.includes('susp') || form.includes('syrup') || form.includes('liquid')) {
      formDetails = 'يُرج المحلول جيداً قبل كل جرعة لضمان تجانس الدواء، مع استخدام المكيال المدرج المرفق بدقة.';
    } else if (form.includes('drop')) {
      formDetails = 'تُقطر الجرعة المقررة مع تجنب ملامسة فوهة القطارة للعين أو الأذن لضمان التعقيم.';
    } else if (form.includes('efferv') || form.includes('sachet')) {
      formDetails = 'يُذاب الكيس/الفوار بالكامل في نصف كوب ماء ويُشرب مباشرة بعد الفوران.';
    }

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

  // Construct Formatted Concise WhatsApp & UI Clinical Capsule Message
  const fullMessageText = `🌿 *كبسولة صيدلية بيتك السريرية • الدليل الدوائي السريع* 💊✨
━━━━━━━━━━━━━━━━━━━
👤 مرحباً بك يا *{name}* في التدريب الصيدلاني السريع!
📦 *الدواء (Brand):* *${name}*
🧪 *التركيبة الكيميائية (Active Ingredient):* ${activeIngredientsEn}
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
  { id: '1', name: '1000mg/200mg amoxicillina/acid clavulanico kabi france', scientificName: 'Amoxicillin + Clavulanic Acid 1g', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 42, sellPrice: 38.0 },
  { id: '2', name: '1, 2, 3 Cold & Flu Syrup', scientificName: 'Paracetamol + Pseudoephedrine + Chlorpheniramine', dosageForm: 'Syrup', category: 'MEDICINES', stockOnHand: 45, sellPrice: 8.5 },
  { id: '3', name: 'Aulin 100mg sospension (Nimesulide)', scientificName: 'Nimesulide 100mg', dosageForm: 'Suspension', category: 'MEDICINES', stockOnHand: 28, sellPrice: 24.0 },
  { id: '4', name: 'Nexium 40mg Tab (Esomeprazole)', scientificName: 'Esomeprazole 40mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 24, sellPrice: 48.0 },
  { id: '5', name: 'Glucophage 500mg (Metformin)', scientificName: 'Metformin HCl 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 35, sellPrice: 15.5 },
  { id: '6', name: 'Lipitor 20mg (Atorvastatin)', scientificName: 'Atorvastatin 20mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 18, sellPrice: 52.0 },
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
