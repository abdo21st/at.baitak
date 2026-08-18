export interface ClinicalProductInput {
  id?: string;
  name: string;
  scientificName?: string;
  activeIngredient?: string;
  dosageForm?: string;
  category?: string;
  stockOnHand?: number;
  sellPrice?: number;
  leafletImageUrl?: string;
  leafletNotes?: string;
}

export interface ClinicalCapsuleData {
  productName: string;
  scientificName: string;
  drugBankId: string;
  drugBankUrl: string;
  indications: string;
  dosageAndAdmin: string;
  majorInteractions: string[];
  warningsAndContraindications: string[];
  patientCounselingTip: string;
  fullMessageText: string;
  isInfoAvailable?: boolean;
  leafletImageUrl?: string;
  // Legacy fields for backwards compatibility
  mechanismAndPk?: string;
  cypMetabolism?: string;
  usageTiming?: string;
  goldenCounselingTip?: string;
  foodAndAlcoholInteractions?: string[];
  blackBoxAndWarnings?: string[];
  liveInfo?: any;
}

/**
 * محرك استخراج التركيبة الكيميائية النقية (Active Chemical Molecule Extractor)
 * يحلل اسم الدواء ويستخرج المواد الفعالة بدقة ويتجاهل أسماء الشركات والجرعات واللغات الإيطالية/الفرنسية/المصرية
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
    .replace(/\b(kabi|france|novartis|gsk|pfizer|sanofi|hikma|egept|egypt|libya|tab|tablets|suspension|sospension|capsule|capsules|inhaler|syrup|drops|spray|vial|amp|retard|forte|coated|plus|extra|hcl|sodium|potassium|fumarate|maleate|calcium|magnesium)\b/gi, ' ')
    .replace(/[^\w\s/+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. IBS & Colon Antispasmodics: Colona, Librax, Duspatalin, Spasmomen
  if (raw.includes('colona')) {
    return {
      normalizedChemicalName: 'Mebeverine Hydrochloride 100mg + Sulpiride 25mg',
      detectedClass: 'مهدئ ومضاد لتشنجات القولون العصبي واضطرابات الهضم (Antispasmodic & Anxiolytic)',
      drugBankId: 'DB01254',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01254'
    };
  }
  if (raw.includes('librax')) {
    return {
      normalizedChemicalName: 'Chlordiazepoxide 5mg + Clidinium Bromide 2.5mg',
      detectedClass: 'مهدئ ومضاد لتقلصات القولون العصبي وقرحة المعدة (Sedative & Antispasmodic)',
      drugBankId: 'DB00475',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00475'
    };
  }
  if (raw.includes('duspatalin') || raw.includes('mebeverine') || raw.includes('spascol')) {
    return {
      normalizedChemicalName: 'Mebeverine Hydrochloride 200mg',
      detectedClass: 'مضاد مباشر لتشنجات القولون العصبي (Direct Smooth Muscle Relaxant)',
      drugBankId: 'DB01254',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01254'
    };
  }
  if (raw.includes('spasmomen') || raw.includes('otilonium')) {
    return {
      normalizedChemicalName: 'Otilonium Bromide 40mg',
      detectedClass: 'مضاد نوعي لتقلصات الجهاز الهضمي والقولون العصبي (Antispasmodic)',
      drugBankId: 'DB09000',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB09000'
    };
  }
  if (raw.includes('buscopan') || raw.includes('hyoscine')) {
    return {
      normalizedChemicalName: 'Hyoscine Butylbromide (Scopolamine)',
      detectedClass: 'مسكن ومضاد للمغص الكلوي والمراري والمعدي (Anticholinergic Antispasmodic)',
      drugBankId: 'DB09265',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB09265'
    };
  }

  // 2. Digestive Enzymes & Intestinal Antiseptics: Spasmo-Digestin, Antinal, Smecta
  if (raw.includes('spasmo-digestin') || raw.includes('spasmodigestin') || raw.includes('digestin')) {
    return {
      normalizedChemicalName: 'Papain + Sanzyme + Sodium Dehydrocholate + Dicyclomine',
      detectedClass: 'مهضم شامل للدهون والبروتينات ومضاد للانتفاخ والتقلصات (Digestive & Antispasmodic)',
      drugBankId: 'DB00804',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00804'
    };
  }
  if (raw.includes('antinal') || raw.includes('nifuroxazide') || raw.includes('diax')) {
    return {
      normalizedChemicalName: 'Nifuroxazide 200mg (Intestinal Antiseptic)',
      detectedClass: 'مطهر معوي واسع المجال للإسهال البكتيري (Intestinal Antibacterial)',
      drugBankId: 'DB08801',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB08801'
    };
  }
  if (raw.includes('smecta') || raw.includes('diasmect') || raw.includes('diosmectite')) {
    return {
      normalizedChemicalName: 'Diosmectite (Smectite Clay)',
      detectedClass: 'ممتز للسموم ومعالج للإسهال الحاد وحامي للغشاء المخاطي (Intestinal Adsorbent)',
      drugBankId: 'DB13769',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB13769'
    };
  }

  // 3. Kidney & Gallstone Spasmolytics: Rowatinex, Rowachol, Urisedon, Uricol
  if (raw.includes('rowatinex')) {
    return {
      normalizedChemicalName: 'Pinene + Camphene + Cineol + Fenchone + Borneol + Anethol',
      detectedClass: 'مفتت لحصوات الكلى ومدر ومطهر ومسكن للمسالك البولية (Urinary Spasmolytic & Litholytic)',
      drugBankId: 'DB00001',
      drugBankUrl: 'https://go.drugbank.com/unearth/q?query=Rowatinex'
    };
  }
  if (raw.includes('rowachol')) {
    return {
      normalizedChemicalName: 'Menthol + Menthone + Pinene + Camphene + Cineol + Borneol',
      detectedClass: 'مذيب لحصوات المرارة ومنشط لإفراز الصفراء (Choleretic & Cholelitholytic)',
      drugBankId: 'DB00002',
      drugBankUrl: 'https://go.drugbank.com/unearth/q?query=Rowachol'
    };
  }
  if (raw.includes('urisedon') || raw.includes('uricol') || raw.includes('hexamine')) {
    return {
      normalizedChemicalName: 'Hyoscyamine + Methenamine + Methylene Blue',
      detectedClass: 'مطهر ومسكن لآلام وحرقة وتقلصات المسالك البولية (Urinary Antiseptic & Analgesic)',
      drugBankId: 'DB06799',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB06799'
    };
  }

  // 4. Amoxicillin + Clavulanic Acid (Co-amoxiclav)
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
    raw.includes('hibiotic') ||
    raw.includes('amoclan')
  ) {
    return {
      normalizedChemicalName: 'Amoxicillin + Clavulanic Acid',
      detectedClass: 'مضاد حيوي واسع المجال (Penicillin + Beta-Lactamase Inhibitor)',
      drugBankId: 'DB01060',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01060'
    };
  }

  // 5. Cold & Flu Triple Combinations (123, Congestal, Comtrex, Flutab, C-Cold)
  if (
    raw.includes('123') ||
    raw.includes('1 2 3') ||
    raw.includes('congestal') ||
    raw.includes('comtrex') ||
    raw.includes('flutab') ||
    raw.includes('cold & flu') ||
    raw.includes('cold and flu') ||
    raw.includes('flurest') ||
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

  // 6. NSAIDs: Nimesulide, Ketorolac, Diclofenac, Ibuprofen, Ketoprofen, Celecoxib
  if (raw.includes('ketolac') || raw.includes('ketorolac')) {
    return {
      normalizedChemicalName: 'Ketorolac Tromethamine (Potent NSAID)',
      detectedClass: 'مسكن آلام حاد ومضاد التهاب غير ستيرويدي قوي جداً (Injectable / Oral NSAID)',
      drugBankId: 'DB00465',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00465'
    };
  }
  if (raw.includes('nimesulide') || raw.includes('aulin') || raw.includes('mesulid')) {
    return {
      normalizedChemicalName: 'Nimesulide 100mg',
      detectedClass: 'مسكن ومضاد التهاب غير ستيرويدي انتقائي (COX-2 Selective NSAID)',
      drugBankId: 'DB00465',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00465'
    };
  }
  if (raw.includes('diclofenac') || raw.includes('voltaren') || raw.includes('cataflam') || raw.includes('declophen')) {
    const isPotassium = raw.includes('cataflam') || raw.includes('potassium');
    return {
      normalizedChemicalName: isPotassium ? 'Diclofenac Potassium (Rapid Action)' : 'Diclofenac Sodium',
      detectedClass: 'مضاد التهاب ومسكن روماتيزمي (NSAID)',
      drugBankId: 'DB01097',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01097'
    };
  }
  if (raw.includes('ibuprofen') || raw.includes('brufen') || raw.includes('advil')) {
    return {
      normalizedChemicalName: 'Ibuprofen',
      detectedClass: 'مسكن للألم ومضاد للالتهاب وخافض للحرارة (NSAID)',
      drugBankId: 'DB01050',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01050'
    };
  }
  if (raw.includes('celebrex') || raw.includes('celecoxib')) {
    return {
      normalizedChemicalName: 'Celecoxib',
      detectedClass: 'مسكن روماتيزمي انتقائي آمن للمعدة (Selective COX-2 Inhibitor)',
      drugBankId: 'DB00482',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00482'
    };
  }

  // 7. Paracetamol / Acetaminophen
  if (raw.includes('paracetamol') || raw.includes('paracetamolo') || raw.includes('panadol') || raw.includes('adol') || raw.includes('cetal')) {
    const isPlusCaffeine = raw.includes('extra') || raw.includes('caffein') || raw.includes('plus');
    return {
      normalizedChemicalName: isPlusCaffeine ? 'Paracetamol + Caffeine' : 'Paracetamol (Acetaminophen)',
      detectedClass: 'مسكن للآلام وخافض للحرارة (Analgesic & Antipyretic)',
      drugBankId: 'DB00316',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00316'
    };
  }

  // 8. PPIs: Esomeprazole, Pantoprazole, Omeprazole, Gaviscon
  if (raw.includes('esomeprazol') || raw.includes('nexium') || raw.includes('emanera')) {
    return {
      normalizedChemicalName: 'Esomeprazole Magnesium',
      detectedClass: 'مثبط مضخة البروتون لعلاج الحموضة والارتجاع (PPI)',
      drugBankId: 'DB00736',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00736'
    };
  }
  if (raw.includes('pantoprazol') || raw.includes('controloc') || raw.includes('pantozol')) {
    return {
      normalizedChemicalName: 'Pantoprazole Sodium',
      detectedClass: 'مثبط مضخة البروتون الآمن لمرضى القلب (PPI)',
      drugBankId: 'DB00213',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00213'
    };
  }
  if (raw.includes('omeprazol') || raw.includes('losec') || raw.includes('omez') || raw.includes('gastrazole')) {
    return {
      normalizedChemicalName: 'Omeprazole',
      detectedClass: 'مثبط إفراز حمض المعدة (PPI)',
      drugBankId: 'DB00338',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00338'
    };
  }
  if (raw.includes('gaviscon')) {
    return {
      normalizedChemicalName: 'Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate',
      detectedClass: 'حاجز رغوي فوري واقي ضد ارتجاع حمض المعدة والمريء (Reflux Barrier)',
      drugBankId: 'DB13840',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB13840'
    };
  }

  // 9. Antiemetics: Domperidone, Metoclopramide
  if (raw.includes('motilium') || raw.includes('domperidone') || raw.includes('gastromotil')) {
    return {
      normalizedChemicalName: 'Domperidone (Dopamine D2 Antagonist)',
      detectedClass: 'منظم لحركة المعدة ومضاد للغثيان والقيء وعسر الهضم (Prokinetic & Antiemetic)',
      drugBankId: 'DB01184',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01184'
    };
  }
  if (raw.includes('primperan') || raw.includes('metoclopramide')) {
    return {
      normalizedChemicalName: 'Metoclopramide Hydrochloride',
      detectedClass: 'منشط لحركة الأمعاء ومضاد للقيء والغثيان (Prokinetic & Antiemetic)',
      drugBankId: 'DB01233',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01233'
    };
  }

  // 10. Vertigo, Ear, Balance & Thyroid: Stugeron, Betaserc, Eltroxin
  if (raw.includes('stugeron') || raw.includes('cinnarizine')) {
    return {
      normalizedChemicalName: 'Cinnarizine (H1 & Calcium Channel Blocker)',
      detectedClass: 'علاج الدوخة والدوار وطنين الأذن واضطرابات التوازن وتصلب الشرايين (Vestibular Sedative)',
      drugBankId: 'DB00568',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00568'
    };
  }
  if (raw.includes('betaserc') || raw.includes('betahistine') || raw.includes('verserc')) {
    return {
      normalizedChemicalName: 'Betahistine Dihydrochloride',
      detectedClass: 'علاج مرض مينيير والدوار وطنين الأذن وضعف التوازن (Histaminergic Agent)',
      drugBankId: 'DB06698',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB06698'
    };
  }
  if (raw.includes('eltroxin') || raw.includes('euthyrox') || raw.includes('levothyroxine')) {
    return {
      normalizedChemicalName: 'Levothyroxine Sodium (T4 Thyroid Hormone)',
      detectedClass: 'هرمون الغدة الدرقية البديل لعلاج قصور ونقص النشاط (Thyroid Hormone Replacement)',
      drugBankId: 'DB00451',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00451'
    };
  }
  if (raw.includes('daflon') || raw.includes('diosmin')) {
    return {
      normalizedChemicalName: 'Micronized Purified Flavonoid Fraction (Diosmin 450mg + Hesperidin 50mg)',
      detectedClass: 'مقوي للأوردة والشعيرات الدموية لعلاج البواسير والدوالي (Venotonic & Vasoprotective)',
      drugBankId: 'DB08995',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB08995'
    };
  }

  // 11. Antibiotics: Azithromycin, Cipro, Cefixime, Flagyl
  if (raw.includes('azithromycin') || raw.includes('zithromax') || raw.includes('azalid')) {
    return {
      normalizedChemicalName: 'Azithromycin (Macrolide)',
      detectedClass: 'مضاد حيوي ماكروليدي قصير الكورس (Macrolide Antibacterial)',
      drugBankId: 'DB00207',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00207'
    };
  }
  if (raw.includes('ciprofloxacin') || raw.includes('cipro') || raw.includes('ciprobay')) {
    return {
      normalizedChemicalName: 'Ciprofloxacin HCl',
      detectedClass: 'مضاد حيوي للمسالك البولية والتنفس (Fluoroquinolone)',
      drugBankId: 'DB00537',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00537'
    };
  }
  if (raw.includes('metronidazole') || raw.includes('flagyl') || raw.includes('amrizole')) {
    return {
      normalizedChemicalName: 'Metronidazole',
      detectedClass: 'مضاد للبكتيريا اللاهوائية ومطهر للطفيليات (Nitroimidazole)',
      drugBankId: 'DB00916',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00916'
    };
  }

  // 12. Cardiac & Chronic: Bisoprolol, Atorvastatin, Metformin, Xarelto, Aspirin
  if (raw.includes('bisoprolol') || raw.includes('concor')) {
    return {
      normalizedChemicalName: 'Bisoprolol Fumarate',
      detectedClass: 'حاصرات بيتا القلبية المنتقاة للضغط وتنظيم ضربات القلب (Beta-1 Blocker)',
      drugBankId: 'DB00612',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00612'
    };
  }
  if (raw.includes('atorvastatin') || raw.includes('lipitor') || raw.includes('ator')) {
    return {
      normalizedChemicalName: 'Atorvastatin Calcium',
      detectedClass: 'مخفض الكوليسترول والدهون الضارة (Statin)',
      drugBankId: 'DB01076',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB01076'
    };
  }
  if (raw.includes('metformin') || raw.includes('glucophage') || raw.includes('cidophage')) {
    return {
      normalizedChemicalName: 'Metformin Hydrochloride',
      detectedClass: 'منظم السكر وحساسية الإنسولين (Biguanide Antidiabetic)',
      drugBankId: 'DB00331',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB00331'
    };
  }
  if (raw.includes('rivaroxaban') || raw.includes('xarelto')) {
    return {
      normalizedChemicalName: 'Rivaroxaban',
      detectedClass: 'مميع دم فموي مباشر للوقاية من الجلطات (DOAC / Factor Xa Inhibitor)',
      drugBankId: 'DB06228',
      drugBankUrl: 'https://go.drugbank.com/drugs/DB06228'
    };
  }

  // General Clean Extraction
  const fallbackQuery = cleanRaw.split(/\s+/).slice(0, 2).join(' ') || 'Drug';
  return {
    normalizedChemicalName: sciName || cleanRaw || name,
    detectedClass: 'مركب دوائي علاجي (Pharmacotherapy Agent)',
    drugBankId: '',
    drugBankUrl: `https://go.drugbank.com/unearth/q?query=${encodeURIComponent(fallbackQuery)}`
  };
}

/**
 * المحرك السريري الذكي الشامل لصيدلية بيتك (Clinical Pharmacotherapy Engine)
 */
export function generateClinicalCapsule(product: ClinicalProductInput): ClinicalCapsuleData {
  const name = (product.name || '').trim();
  const sciName = (product.scientificName || product.activeIngredient || '').trim();
  const form = (product.dosageForm || '').toLowerCase();

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
  // 1. COLON & IBS: Colona, Librax, Duspatalin, Spasmomen, Buscopan
  // -------------------------------------------------------------
  if (activeIngredientsEn.includes('Mebeverine') || activeIngredientsEn.includes('Sulpiride') || activeIngredientsEn.includes('Clidinium') || activeIngredientsEn.includes('Otilonium') || activeIngredientsEn.includes('Hyoscine')) {
    const isColona = activeIngredientsEn.includes('Sulpiride') || name.toLowerCase().includes('colona');
    indications = isColona
      ? 'علاج متلازمة القولون العصبي (IBS)، المغص المعوي، الانتفاخ، عسر الهضم والتقلصات المصحوبة بالتوتر أو القلق النفسي.'
      : 'علاج تقلصات وتشنجات القولون العصبي، المغص الكلوي والمراري، والاضطرابات الوظيفية للجهاز الهضمي.';
    dosageAndAdmin = '• قرص واحد 2 إلى 3 مرات يومياً قبل الوجبات بـ 20 دقيقة مع كوب ماء.';
    majorInteractions = [
      '🔴 المهدئات ومضادات الاكتئاب الأخرى: يزيد من التأثير المهدئ والنعاس.',
      '🟠 مضادات الحموضة: باعد ساعتين بين تناولها وبين أدوية القولون لتجنب تقليل الامتصاص.'
    ];
    warningsAndContraindications = [
      '⚠️ يفضل تناوله بانتظام قبل الأكل لتحقيق أقصى ارتخاء لعضلات القولون الملساء.',
      '✅ آمن لمعظم المرضى ولا يؤثر على ضغط الدم أو حركة الأمعاء الطبيعية.'
    ];
    patientCounselingTip = 'تناول الحبة قبل الأكل بـ 20 دقيقة مع كوب ماء كامل، وتجنب الوجبات الدسمة والمشروبات الغازية لتقليل تهيج القولون.';
  }

  // -------------------------------------------------------------
  // 2. DIGESTIVE ENZYMES & INTESTINAL ANTISEPTICS: Spasmo-Digestin, Antinal, Smecta
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Papain') || activeIngredientsEn.includes('Nifuroxazide') || activeIngredientsEn.includes('Diosmectite')) {
    const isAntinal = activeIngredientsEn.includes('Nifuroxazide');
    const isSmecta = activeIngredientsEn.includes('Diosmectite');
    indications = isAntinal
      ? 'علاج الإسهال الحاد والنزلة المعوية الناتجة عن العدوى البكتيرية وتطهير الجهاز الهضمي دون التأثير على الفلورا النافعة.'
      : isSmecta
      ? 'علاج الإسهال الحاد والمزمن وامتزاز السموم والغازات وحماية بطانة المعدة والأمعاء.'
      : 'علاج عسر الهضم المزمن، الشعور بالامتلاء والانتفاخ، وسوء هضم الدهون والبروتينات بعد الوجبات الدسمة.';
    dosageAndAdmin = isAntinal
      ? '• البالغين: كبسولة واحدة (200 ملغ) 4 مرات يومياً (كل 6 ساعات) لمدة 3-5 أيام.\n• الأطفال: معلق شراب 5 مل 3-4 مرات يومياً.'
      : isSmecta
      ? '• كيس واحد يذاب في نصف كوب ماء 3 مرات يومياً بين الوجبات.'
      : '• قرص إلى قرصين أثناء أو في نهاية كل وجبة رئيسية مباشرة.';
    majorInteractions = [
      '🟠 أدوية أخرى: مادة Smecta تمتص الأدوية الأخرى؛ يجب الفصل بساعتين على الأقل عن أي علاج آخر.'
    ];
    warningsAndContraindications = [
      '⚠️ في حالات الإسهال الحاد: يجب تعويض السوائل والأملاح (ORS) لتفادي الجفاف خاصة عند الأطفال وكبار السن.'
    ];
    patientCounselingTip = isAntinal
      ? 'تناول العلاج بانتظام كل 6 ساعات مع شرب كميات وافرة من الماء ومحلول الجفاف، ولا تتوقف عن العلاج بمجرد توقف الإسهال.'
      : 'تناول الدواء في منتصف أو بعد الأكل مباشرة لهضم الطعام بكفاءة ومنع الانتفاخ.';
  }

  // -------------------------------------------------------------
  // 3. KIDNEY & GALLSTONE SPASMOLYTICS: Rowatinex, Rowachol, Urisedon
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Pinene') || activeIngredientsEn.includes('Menthol') || activeIngredientsEn.includes('Hyoscyamine')) {
    const isRowachol = activeIngredientsEn.includes('Menthol');
    indications = isRowachol
      ? 'إذابة وتفتيت حصوات المرارة الصغيرة، تنشيط إفراز العصارة الصفراوية، وعلاج التهاب وحركات القنوات المرارية.'
      : 'تفتيت وتسهيل خروج حصوات الكلى والحالب، إدرار البول، وتسكين المغص الكلوي وحرقة المسالك البولية.';
    dosageAndAdmin = '• 1 إلى 2 كبسولة 3 مرات يومياً قبل الوجبات بنصف ساعة مع شرب كميات وفيرة من الماء (2-3 لتر يومياً).';
    majorInteractions = [
      '🔴 مميعات الدم (Warfarin): الزيوت الأساسية قد تعزز طفيفاً من تأثير مميعات الدم.'
    ];
    warningsAndContraindications = [
      '⚠️ الإكثار من شرب الماء على مدار اليوم أساسي لنجاح العلاج في طرد الحصوات والرواسب.'
    ];
    patientCounselingTip = 'احرص على شرب ما لا يقل عن 2 إلى 3 لترات من الماء يومياً أثناء فترة العلاج للمساعدة في تنظيف الكلى وطرد الأملاح والحصوات.';
  }

  // -------------------------------------------------------------
  // 4. AMOXICILLIN + CLAVULANIC ACID (Co-amoxiclav)
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Amoxicillin')) {
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
  // 5. COLD & FLU COMBINATIONS: 123, Congestal, Comtrex, Flutab
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
  // 6. NSAIDs: KETOROLAC, NIMESULIDE, DICLOFENAC, IBUPROFEN
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Ketorolac') || activeIngredientsEn.includes('Nimesulide') || activeIngredientsEn.includes('Diclofenac') || activeIngredientsEn.includes('Ibuprofen') || activeIngredientsEn.includes('Celecoxib')) {
    const isKeto = activeIngredientsEn.includes('Ketorolac');
    const isDiclo = activeIngredientsEn.includes('Diclofenac');
    indications = 'تسكين آلام المفاصل والروماتيزم، آلام الأسنان الحادة، آلام ما بعد العمليات الجراحية، الصداع والالتهابات العضلية.';
    dosageAndAdmin = isKeto
      ? '• 10 ملغ كل 6-8 ساعات عند اللزوم بعد الأكل (أقصى مدة استخدام 5 أيام فقط لمنع التأثير الكلوي والمعدي).'
      : isDiclo
      ? '• 50 ملغ مرتين إلى 3 مرات يومياً بعد الوجبات مباشرة مع كوب ماء وفير.'
      : '• 400 - 600 ملغ 3 مرات يومياً بعد الأكل مباشرة.';
    majorInteractions = [
      '🔴 مميعات الدم ومضادات التخثر (Warfarin, Aspirin, DOACs): تضاعف خطر النزيف وقرحة الجهاز الهضمي.',
      '🔴 أدوية الضغط (ACEIs / ARBs) ومدرات البول: يقلل مفعولها الخافض للضغط ويزيد إجهاد الكلى (Nephrotoxicity).'
    ];
    warningsAndContraindications = [
      '🚫 ممنوع لمرضى قرحة المعدة النشطة والنزيف الهضمي والقصور الكلوي الشديد.',
      '⚠️ يمنع استخدامه في الثلث الأخير من الحمل.'
    ];
    patientCounselingTip = 'يجب تناوله بعد وجبة طعام كاملة مع شرب ماء وفير لحماية المعدة، والتوقف عنه فوراً إذا ظهرت آلام حادة بالمعدة أو براز أسود.';
  }

  // -------------------------------------------------------------
  // 7. PARACETAMOL / ACETAMINOPHEN (Panadol, Adol, Calpol)
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Paracetamol')) {
    indications = 'تسكين الآلام الخفيفة إلى المتوسطة (الصداع، ألم الأسنان، آلام العضلات والمفاصل) وخفض درجات الحرارة المرتفعة والحمى.';
    dosageAndAdmin = '• البالغين: 500 ملغ إلى 1000 ملغ (قرص إلى قرصين) كل 6-8 ساعات عند اللزوم (أقصى جرعة يومية 4000 ملغ / 4 غرام).\n• الأطفال: 10 - 15 ملغ/كغ كل 6 ساعات حسب وزن الطفل.';
    majorInteractions = [
      '🔴 الكحول المزمن ومحفزات الإنزيمات: تزيد إنتاج المستقلب السام للكبد (NAPQI).',
      '🟠 دواء الوارفارين (Warfarin): الجرعات العالية المنتظمة (> 2 غرام يومياً) ترفع مؤشر سيولة الدم (INR).'
    ];
    warningsAndContraindications = [
      '⚠️ الالتزام الصارم بالجرعة القصوى (4 غرام يومياً) لتفادي الفشل الكبدي الحاد (Hepatic Toxicity).',
      '✅ الخيار الأكثر أماناً للحوامل والمرضعات ومرضى القرحة المعدية ومرضى الكلى.'
    ];
    patientCounselingTip = 'يُؤخذ مع أو بدون طعام، مع مراعاة فاصل 4 إلى 6 ساعات بين الجرعات، وتجنب تناوله بالتزامن مع أدوية نزلات البرد التي تحتوي على الباراسيتامول.';
  }

  // -------------------------------------------------------------
  // 8. PPIs & REFLUX: Nexium, Controloc, Omeprazole, Gaviscon
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('prazole') || activeIngredientsEn.includes('Prazole') || activeIngredientsEn.includes('Esomeprazole') || activeIngredientsEn.includes('Pantoprazole') || activeIngredientsEn.includes('Alginate')) {
    indications = 'علاج ارتجاع المريء (GERD)، قرحة المعدة والاثني عشر، الحماية من تقرحات المسكنات، وجرثومة المعدة (H. pylori).';
    dosageAndAdmin = '• قرص واحد (20 أو 40 ملغ) صباحاً على الريق قبل الفطور بـ 30 إلى 60 دقيقة يومياً. تُبلع الحبة كاملة دون كسر أو مضغ.';
    majorInteractions = [
      '🔴 بلافيكس (Clopidogrel): الأوميبرازول والإيزوميبرازول يقللان فعالية البلافيكس (البانتوبرازول هو البديل الآمن).',
      '🟠 مكملات الحديد والكالسيوم ومضادات الفطريات: يقل امتصاصها نتيجة قلة حموضة المعدة.'
    ];
    warningsAndContraindications = [
      '⚠️ الاستخدام المطول لأشهر طويلة: قد يسبب نقص المغنيسيوم وفيتامين B12 وضعف امتصاص الكالسيوم.',
      '✅ ممتاز وآمن لمعظم المرضى عند الالتزام بالتوقيت الصحيح.'
    ];
    patientCounselingTip = 'تناول الحبة كاملة على معدة فارغة قبل الفطور بنصف ساعة على الأقل، حيث يفقد الدواء 50% من فعاليته إذا تم تناوله بعد الأكل.';
  }

  // -------------------------------------------------------------
  // 9. EAR, VERTIGO, THYROID & VASCULAR: Stugeron, Betaserc, Eltroxin, Daflon
  // -------------------------------------------------------------
  else if (activeIngredientsEn.includes('Cinnarizine') || activeIngredientsEn.includes('Betahistine') || activeIngredientsEn.includes('Levothyroxine') || activeIngredientsEn.includes('Diosmin')) {
    const isThyroid = activeIngredientsEn.includes('Levothyroxine');
    const isDaflon = activeIngredientsEn.includes('Diosmin');
    indications = isThyroid
      ? 'علاج قصور ونقص إفراز هرمون الغدة الدرقية (Hypothyroidism) وتنظيم العمليات الحيوية والتمثيل الغذائي بالجسم.'
      : isDaflon
      ? 'علاج نوبات البواسير الحادة، القصور الوريدي المزمن، دوالي الساقين، وثقل وتورم الأطراف السفلية.'
      : 'علاج الدوار والدوخة، مرض مينيير، طنين الأذن، وضعف التوازن والتروية الدموية الدقيقة للأذن الداخلية والمخ.';
    dosageAndAdmin = isThyroid
      ? '• قرص واحد يومياً صباحاً على معدة فارغة تماماً قبل الفطور بـ 30 إلى 60 دقيقة مع كوب ماء فقط.'
      : isDaflon
      ? '• البواسير الحادة: 6 أقراص يومياً (2 قرص 3 مرات) لأول 4 أيام، ثم 4 أقراص يومياً لـ 3 أيام بعد الأكل.\n• الدوالي: قرصان يومياً بعد الأكل.'
      : '• قرص واحد (8 أو 16 أو 24 ملغ) مرتين إلى 3 مرات يومياً بعد الأكل.';
    majorInteractions = [
      isThyroid
        ? '🔴 الكالسيوم والحديد وفيتامينات المعادن: تعطل امتصاص هرمون الغدة تماماً؛ يجب الفصل بـ 4 ساعات على الأقل.'
        : '🟠 أدوية مضادات الهيستامين: قد تعاكس مفعول البيتاسيرك (Betahistine).'
    ];
    warningsAndContraindications = [
      isThyroid
        ? '⚠️ الالتزام بالفحص الدوري لهرمون TSH وتجنب تغيير جرعة الثيروكسين إلا بأمر الطبيب.'
        : '⚠️ الالتزام بالجرعات في مواعيدها مع الوجبات لتجنب الغثيان.'
    ];
    patientCounselingTip = isThyroid
      ? 'تناول الحبة فور الاستيقاظ صباحاً مع الماء فقط وانتظر 45 دقيقة قبل الإفطار أو شرب القهوة والشاي، وافصل 4 ساعات عن حبوب الحديد والكالسيوم.'
      : 'تناول الدواء بانتظام بعد الوجبات للحصول على أفضل تحسن للأعراض.';
  }

  // -------------------------------------------------------------
  // 10. UNKNOWN / NOT FOUND CLINICAL FALLBACK (No Chemical Profile)
  // -------------------------------------------------------------
  else {
    const isActuallyKnown = Boolean(sciName && sciName.length > 2 && sciName !== name);

    if (isActuallyKnown) {
      indications = 'يُستخدم وفق دواعي الاستعمال الطبية المعتمدة للمادة الفعالة والشكل الصيدلاني.';
      dosageAndAdmin = `• يُؤخذ بانتظام بالجرعة المقررة مع كوب ماء وفير (250 مل) وفي نفس الموعد يومياً.`;
      majorInteractions = [
        '🔴 تفاعلات معززة للسمية: استشر الصيدلي دائماً عند استخدام أدوية السيولة، مسكنات الروماتيزم، أو أدوية الأمراض المزمنة.',
        '🟠 مكملات المعادن ومضادات الحموضة: باعد ساعتين عن تناول الحديد والكالسيوم ومضادات الحموضة.'
      ];
      warningsAndContraindications = [
        '⚠️ الالتزام الصارم بالجرعات الموصوفة وتجنب مضاعفة الجرعة عند النسيان.',
        '⚠️ إبلاغ الصيدلي عن أي تاريخ مرضي أو حمل أو رضاعة قبل الاستخدام.'
      ];
      patientCounselingTip = 'احرص على سؤال المريض عن الأدوية المزمنة الأخرى التي يتناولها، والتأكيد على تناول الدواء بانتظام في مواعيده المحددة.';
    } else {
      indications = '⚠️ لا تتوفر معلومات سريرية حالياً لهذا الصنف في قواعد البيانات المعتمدة.';
      dosageAndAdmin = '• يرجى مراجعة النشرة الداخلية المرفقة مع عبوة الدواء أو استشارة الصيدلي المشرف.';
      majorInteractions = [
        '⚠️ لم يتم تسجيل تداخلات دوائية مؤكدة لعدم توفر التركيبة الكيميائية - يرجى تصوير النشرة بالأسفل لتسجيلها.'
      ];
      warningsAndContraindications = [
        '⚠️ لا تقم بصرف الدواء أو تقديم استشارة للمريض دون التأكد من المادة الفعالة المعتمدة.'
      ];
      patientCounselingTip = 'يرجى تصوير نشرة المنتج أو العلبة من الزر بالأسفل لقراءتها وحفظ بياناتها في قاعدة البيانات السحابية.';
    }
  }

  const isAvailable = !(indications.includes('لا تتوفر معلومات'));

  // Construct Formatted Concise WhatsApp & UI Clinical Capsule Message
  const fullMessageText = isAvailable
    ? `🌿 *كبسولة صيدلية بيتك السريرية • الدليل الدوائي السريع* 💊✨
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
🌿 *صيدلية بيتك.. رعاية صيدلانية متكاملة ومبسطة!* ✨`
    : `🌿 *كبسولة صيدلية بيتك السريرية • تنبيه توثيق الصنف* 💊
━━━━━━━━━━━━━━━━━━━
📦 *الصنف:* *${name}*
🧪 *التركيبة الكيميائية:* غير متوفرة حالياً
⚠️ *الحالة:* لا تتوفر معلومات سريرية معتمدة لهذا الصنف حالياً في قواعد البيانات.
📷 *الإجراء المطلوب:* يرجى تصوير النشرة الداخلية أو العلبة من زر الكاميرا بالأسفل لتوثيق التركيبة وإضافتها للسيرفر السحابي.
━━━━━━━━━━━━━━━━━━━
🌿 *صيدلية بيتك.. رعاية صيدلانية دقيقة وموثوقة!* ✨`;

  return {
    productName: name,
    scientificName: isAvailable ? activeIngredientsEn : 'غير متوفرة حالياً (بانتظار تصوير النشرة)',
    drugBankId,
    drugBankUrl,
    indications,
    dosageAndAdmin,
    majorInteractions,
    warningsAndContraindications,
    patientCounselingTip,
    fullMessageText,
    isInfoAvailable: isAvailable,
    leafletImageUrl: product.leafletImageUrl,
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
  { id: '1', name: 'Colona 30tab*3 Egept', scientificName: 'Mebeverine HCl 100mg + Sulpiride 25mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 35, sellPrice: 28.0 },
  { id: '2', name: '1000mg/200mg amoxicillina/acid clavulanico kabi france', scientificName: 'Amoxicillin + Clavulanic Acid 1g', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 42, sellPrice: 38.0 },
  { id: '3', name: '1, 2, 3 Cold & Flu Syrup', scientificName: 'Paracetamol + Pseudoephedrine + Chlorpheniramine', dosageForm: 'Syrup', category: 'MEDICINES', stockOnHand: 45, sellPrice: 8.5 },
  { id: '4', name: 'Aulin 100mg sospension (Nimesulide)', scientificName: 'Nimesulide 100mg', dosageForm: 'Suspension', category: 'MEDICINES', stockOnHand: 28, sellPrice: 24.0 },
  { id: '5', name: 'Nexium 40mg Tab (Esomeprazole)', scientificName: 'Esomeprazole 40mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 24, sellPrice: 48.0 },
  { id: '6', name: 'Glucophage 500mg (Metformin)', scientificName: 'Metformin HCl 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 35, sellPrice: 15.5 },
  { id: '7', name: 'Lipitor 20mg (Atorvastatin)', scientificName: 'Atorvastatin 20mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 18, sellPrice: 52.0 },
  { id: '8', name: 'Concor 5mg (Bisoprolol)', scientificName: 'Bisoprolol Fumarate 5mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 28, sellPrice: 26.0 },
  { id: '9', name: 'Voltaren 50mg (Diclofenac Sodium)', scientificName: 'Diclofenac Sodium 50mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 50, sellPrice: 18.0 },
  { id: '10', name: 'Panadol Extra Tab (Paracetamol + Caffeine)', scientificName: 'Paracetamol 500mg + Caffeine 65mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 65, sellPrice: 12.0 },
  { id: '11', name: 'Antinal 200mg (Nifuroxazide)', scientificName: 'Nifuroxazide 200mg', dosageForm: 'Capsules', category: 'MEDICINES', stockOnHand: 40, sellPrice: 16.0 },
  { id: '12', name: 'Rowatinex Caps (Urinary Spasmolytic)', scientificName: 'Essential Terpenes', dosageForm: 'Capsules', category: 'MEDICINES', stockOnHand: 30, sellPrice: 22.0 },
  { id: '13', name: 'Daflon 500mg (Diosmin + Hesperidin)', scientificName: 'Micronized Flavonoids 500mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 32, sellPrice: 36.0 },
  { id: '14', name: 'Duspatalin 200mg Retard (Mebeverine)', scientificName: 'Mebeverine HCl 200mg', dosageForm: 'Capsules', category: 'MEDICINES', stockOnHand: 26, sellPrice: 35.0 },
  { id: '15', name: 'Xarelto 20mg Tab (Rivaroxaban)', scientificName: 'Rivaroxaban 20mg', dosageForm: 'Tablets', category: 'MEDICINES', stockOnHand: 10, sellPrice: 180.0 }
];
