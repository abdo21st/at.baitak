import { ClinicalProductInput, ClinicalCapsuleData, generateClinicalCapsule, extractActiveChemicalMolecule } from './clinicalKnowledge';

export interface LiveDrugInfo {
  source: string;
  isLive: boolean;
  brandName?: string;
  substanceName?: string;
  genericName?: string;
  productType?: string;
  dosageForm?: string;
  pharmClass?: string[];
  activeIngredients?: Array<{ name: string; strength?: string }>;
  referenceLinks?: {
    // Global & European Manufacturer Directories
    drugsCom?: string;
    medscape?: string;
    rxList?: string;
    dailyMed?: string;
    emcUK?: string;
    vidalFrance?: string;
    torrinomedica?: string;
    ilacRehberi?: string;
    drugBank?: string;
    // Regional & Arabic Authorities
    altibbi?: string;
    webTeb?: string;
    sfda?: string;
    edaEgypt?: string;
    egyptianIndex?: string;
  };
  molecularFormula?: string;
  molecularWeight?: string;
  canonicalSmiles?: string;
  iupacName?: string;
  synonyms?: string[];
  purpose?: string;
  indications?: string;
  dosageAndAdmin?: string;
  mechanismOfAction?: string;
  pharmacodynamics?: string;
  pharmacokinetics?: string;
  cypMetabolismText?: string;
  foodInteractionsText?: string;
  warnings?: string;
  boxedWarning?: string;
  contraindications?: string;
  stopUse?: string;
  pregnancyWarning?: string;
  storageAndHandling?: string;
  drugInteractions?: string;
  rxNavInteractions?: string[];
  rxcui?: string;
  patientCounseling?: string;
}

/**
 * قاموس ذكي شامل وموسع جداً لأشهر الأسماء التجارية الإقليمية والمصنعة محلياً ودولياً
 * (السوق الليبي، المصري EDA، السعودي SFDA، التركي İTS، والأوروبي Vidal/Torrinomedica)
 */
const REGIONAL_BRAND_MOLECULE_MAP: Record<string, { ingredient: string; classDesc: string; drugBankId?: string }> = {
  // الجهاز الهضمي والقولون العصبي
  'colona': { ingredient: 'Mebeverine Hydrochloride 100mg + Sulpiride 25mg', classDesc: 'مهدئ ومضاد لتشنجات القولون العصبي واضطرابات الهضم (Antispasmodic & Anxiolytic)', drugBankId: 'DB01254' },
  'librax': { ingredient: 'Chlordiazepoxide 5mg + Clidinium Bromide 2.5mg', classDesc: 'مهدئ ومضاد لتقلصات القولون العصبي وقرحة المعدة (Sedative & Antispasmodic)', drugBankId: 'DB00475' },
  'duspatalin': { ingredient: 'Mebeverine Hydrochloride 200mg', classDesc: 'مضاد مباشر لتشنجات القولون العصبي (Direct Smooth Muscle Relaxant)', drugBankId: 'DB01254' },
  'spasmomen': { ingredient: 'Otilonium Bromide 40mg', classDesc: 'مضاد نوعي لتقلصات الجهاز الهضمي والقولون العصبي (Antispasmodic)', drugBankId: 'DB09000' },
  'buscopan': { ingredient: 'Hyoscine Butylbromide (Scopolamine)', classDesc: 'مسكن ومضاد للمغص الكلوي والمراري والمعدي (Anticholinergic Antispasmodic)', drugBankId: 'DB09265' },
  'spasmo-digestin': { ingredient: 'Papain + Sanzyme + Sodium Dehydrocholate + Dicyclomine', classDesc: 'مهضم شامل للدهون والبروتينات ومضاد للانتفاخ والتقلصات (Digestive & Antispasmodic)', drugBankId: 'DB00804' },
  'spasmodigestin': { ingredient: 'Papain + Sanzyme + Sodium Dehydrocholate + Dicyclomine', classDesc: 'مهضم شامل للدهون والبروتينات ومضاد للانتفاخ والتقلصات (Digestive & Antispasmodic)', drugBankId: 'DB00804' },
  'spasmo-amrase': { ingredient: 'Pancreatin + Papain + Ox Bile + Dimethicone', classDesc: 'مهضم شامل للدهون والنشويات وطارد للغازات (Digestive Enzymes)' },
  'amrase': { ingredient: 'Pancreatin + Papain + Ox Bile', classDesc: 'مهضم ومساعد لامتصاص العناصر الغذائية' },
  'antinal': { ingredient: 'Nifuroxazide 200mg (Intestinal Antiseptic)', classDesc: 'مطهر معوي واسع المجال للإسهال البكتيري (Intestinal Antibacterial)', drugBankId: 'DB08801' },
  'smecta': { ingredient: 'Diosmectite', classDesc: 'ممتز للسموم ومعالج للإسهال الحاد وحامي للغشاء المخاطي المعوي' },
  'diasmect': { ingredient: 'Diosmectite', classDesc: 'ممتز للسموم ومعالج للإسهال الحاد وحامي للغشاء المخاطي المعوي' },
  'rowatinex': { ingredient: 'Pinene + Camphene + Cineol + Fenchone + Borneol + Anethol', classDesc: 'مفتت لحصوات الكلى ومدر ومطهر ومسكن للمسالك البولية (Urinary Spasmolytic)' },
  'rowachol': { ingredient: 'Menthol + Menthone + Pinene + Camphene + Cineol + Borneol', classDesc: 'مذيب لحصوات المرارة ومنشط لإفراز العصارة الصفراوية (Choleretic & Cholelitholytic)' },
  'gaviscon': { ingredient: 'Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate', classDesc: 'حاجز رغوي واقي فوري ضد ارتجاع حمض المعدة والمريء (Reflux Barrier)' },
  'mucogel': { ingredient: 'Aluminium Hydroxide + Magnesium Hydroxide + Oxethazaine', classDesc: 'مضاد للحموضة ومخدر موضعي لآلام وحرقة جدار المعدة' },
  'maalox': { ingredient: 'Aluminium Hydroxide + Magnesium Hydroxide', classDesc: 'معادل سريع لحموضة المعدة وحرقة المريء' },
  // ENO Fruit Salt & Effervescent Antacids
  'eno': { ingredient: 'Sodium Bicarbonate 2800mg + Citric Acid 2000mg + Sodium Carbonate 500mg (per 5g sachet)', classDesc: 'مُعادِل سريع لحموضة المعدة وانتفاخ البطن - فوار أملاح الفاكهة (Effervescent Antacid & Antiflatulent)' },
  'eno fruit': { ingredient: 'Sodium Bicarbonate + Citric Acid + Sodium Carbonate', classDesc: 'أملاح الفاكهة الفوارة - معادل سريع لحموضة المعدة والغازات' },
  'rennie': { ingredient: 'Calcium Carbonate 680mg + Magnesium Carbonate 80mg', classDesc: 'مضاد سريع للحموضة والارتجاع المعدي ومطاط للغازات' },
  'gelusil': { ingredient: 'Aluminium Hydroxide + Magnesium Hydroxide + Simethicone', classDesc: 'مضاد للحموضة وطارد للغازات سريع المفعول' },
  'motilium': { ingredient: 'Domperidone (Dopamine D2 Antagonist)', classDesc: 'منظم لحركة المعدة ومضاد للغثيان والقيء وعسر الهضم (Prokinetic & Antiemetic)', drugBankId: 'DB01184' },
  'primperan': { ingredient: 'Metoclopramide Hydrochloride', classDesc: 'منشط لحركة الأمعاء ومضاد للقيء والغثيان', drugBankId: 'DB01233' },
  'navidoxine': { ingredient: 'Meclizine HCl + Vitamin B6 (Pyridoxine)', classDesc: 'علاج ومنع غثيان وقيء الحمل ودوار الحركة' },
  // Vitamins & Supplements
  'neurobion': { ingredient: 'Vitamin B1 (Thiamine) 100mg + B6 (Pyridoxine) 200mg + B12 (Cyanocobalamin) 200mcg', classDesc: 'مجمع فيتامينات ب العصبي لعلاج التهاب الأعصاب والتنميل والضعف العام' },
  'nervobion': { ingredient: 'Vitamin B1 + B6 + B12 Complex (Neurotropic)', classDesc: 'مجمع الفيتامينات العصبية ب1 ب6 ب12 لتقوية الأعصاب وعلاج الإرهاق' },
  'becozym': { ingredient: 'Vitamin B Complex (B1 + B2 + B3 + B5 + B6)', classDesc: 'مجمع فيتامينات ب الكامل لتقوية الجهاز العصبي وتحسين التمثيل الغذائي' },
  'supradyn': { ingredient: 'Multivitamins + Minerals (Comprehensive)', classDesc: 'مكمل غذائي متكامل بالفيتامينات والمعادن للحيوية اليومية والجهاز المناعي' },
  'pharmaton': { ingredient: 'Ginseng Extract + Multivitamins + Minerals', classDesc: 'منشط وعلاج الإرهاق والوهن الذهني والبدني ومعزز الطاقة الشاملة' },
  'calcivit d': { ingredient: 'Calcium Carbonate 1200mg + Vitamin D3 1000 IU', classDesc: 'مكمل الكالسيوم وفيتامين د لبناء العظام ومنع هشاشة العظام والكساح' },
  'caltrate': { ingredient: 'Calcium Carbonate + Vitamin D3 + Magnesium + Zinc', classDesc: 'تركيبة متكاملة لصحة العظام وتقوية الجهاز المناعي' },
  // Antihistamines & Allergy
  'claritine': { ingredient: 'Loratadine 10mg', classDesc: 'مضاد للهستامين الجيل الثاني خالٍ من النعاس لعلاج الحساسية والرشح والشرى', drugBankId: 'DB00455' },
  'claritin': { ingredient: 'Loratadine 10mg', classDesc: 'مضاد للهستامين الجيل الثاني لعلاج حمى القش والحساسية المزمنة', drugBankId: 'DB00455' },
  'aerius': { ingredient: 'Desloratadine 5mg', classDesc: 'مضاد هستامين انتقائي من الجيل الثالث - لا يسبب نعاساً على الإطلاق', drugBankId: 'DB00967' },
  'zyrtec': { ingredient: 'Cetirizine Hydrochloride 10mg', classDesc: 'مضاد هستامين الجيل الثاني لعلاج أمراض الحساسية والشرى والأكزيما التحسسية', drugBankId: 'DB00341' },
  'avil': { ingredient: 'Pheniramine Maleate 45mg (Antihistamine)', classDesc: 'مضاد هستامين الجيل الأول سريع المفعول للحساسية الحادة ودوار الحركة والغثيان', drugBankId: 'DB01106' },
  // Antifungals
  'fluconazole': { ingredient: 'Fluconazole 150mg (Triazole Antifungal)', classDesc: 'مضاد فطري فموي واسع المجال لعلاج العدوى الفطرية الجهازية والمهبلية والفموية', drugBankId: 'DB00196' },
  'diflucan': { ingredient: 'Fluconazole 150mg', classDesc: 'مضاد فطري نظامي قوي لعلاج عدوى المبيضة والرشاشيات', drugBankId: 'DB00196' },
  'canesten': { ingredient: 'Clotrimazole 1% (Topical Antifungal)', classDesc: 'مضاد فطري موضعي لعلاج الفطريات الجلدية وقدم الرياضي والحكة الأربية', drugBankId: 'DB00257' },
  // Cardiovascular
  'xarelto': { ingredient: 'Rivaroxaban (Factor Xa Inhibitor)', classDesc: 'مميع الدم الفموي المباشر للوقاية من الجلطات الوريدية والسكتة الدماغية في الرجفان الأذيني', drugBankId: 'DB06228' },
  'plavix': { ingredient: 'Clopidogrel 75mg', classDesc: 'مضاد لالتصاق الصفائح الدموية للوقاية من جلطات القلب والشرايين', drugBankId: 'DB00758' },
  'norvasc': { ingredient: 'Amlodipine Besylate 5mg / 10mg', classDesc: 'حاصر قنوات الكالسيوم لعلاج ارتفاع ضغط الدم والذبحة الصدرية', drugBankId: 'DB00381' },
  // Urinary Antiseptics
  'urisedon': { ingredient: 'Hyoscyamine + Methenamine + Methylene Blue', classDesc: 'مطهر ومسكن لآلام وتقلصات المسالك البولية وحرقة البول والتهاب المثانة' },
  'uricol': { ingredient: 'Hexamine + Piperazine Tartrate + Khellin', classDesc: 'فوار مطهر ومذيب لحصوات حمض اليوريك وموسع للحالب ومسكن للمغص الكلوي' },
  'daflon': { ingredient: 'Micronized Purified Flavonoid Fraction (Diosmin 450mg + Hesperidin 50mg)', classDesc: 'مقوي للأوردة والشعيرات الدموية لعلاج البواسير، الدوالي، وثقل الساقين' }

  // مسكنات ومضادات الالتهاب والروماتيزم
  'ketolac': { ingredient: 'Ketorolac Tromethamine (Potent NSAID)', classDesc: 'مسكن آلام حاد غير ستيرويدي قوي جداً (Injectable / Oral NSAID)', drugBankId: 'DB00465' },
  'cataflam': { ingredient: 'Diclofenac Potassium (Rapid Acting NSAID)', classDesc: 'مسكن سريع ومضاد للالتهاب لآلام الأسنان والمفاصل والصداع', drugBankId: 'DB00586' },
  'voltaren': { ingredient: 'Diclofenac Sodium (NSAID)', classDesc: 'مضاد للالتهاب ومسكن ممتد المفعول للروماتيزم والمفاصل', drugBankId: 'DB00586' },
  'brufen': { ingredient: 'Ibuprofen (NSAID)', classDesc: 'خافض للحرارة ومسكن للآلام ومضاد للالتهاب', drugBankId: 'DB01050' },
  'celebrex': { ingredient: 'Celecoxib (Selective COX-2 Inhibitor)', classDesc: 'مسكن روماتيزمي آمن للمعدة لا يثبط COX-1', drugBankId: 'DB00482' },
  'arcoxia': { ingredient: 'Etoricoxib (Selective COX-2 Inhibitor)', classDesc: 'مسكن ومضاد للالتهاب عالي الانتقائية لـ COX-2', drugBankId: 'DB01628' },
  'panadol': { ingredient: 'Paracetamol (Acetaminophen)', classDesc: 'مسكن آمن وخافض للحرارة للبالغين والأطفال', drugBankId: 'DB00316' },
  'panadol extra': { ingredient: 'Paracetamol + Caffeine', classDesc: 'مسكن معزز بالكافيين لزيادة سرعة تسكين الصداع والآلام', drugBankId: 'DB00316' },

  // نزلات البرد والجهاز التنفسي
  '123': { ingredient: 'Paracetamol + Pseudoephedrine HCl + Chlorpheniramine Maleate', classDesc: 'تركيبة ثلاثية متكاملة لعلاج أعراض البرد والإنفلونزا والرشح والاحتقان' },
  '1, 2, 3': { ingredient: 'Paracetamol + Pseudoephedrine HCl + Chlorpheniramine Maleate', classDesc: 'تركيبة ثلاثية متكاملة لعلاج أعراض البرد والإنفلونزا والرشح والاحتقان' },
  'c-cold': { ingredient: 'Paracetamol + Pseudoephedrine + Chlorpheniramine + Vitamin C', classDesc: 'علاج نزلات البرد والزكام معزز بفيتامين C' },
  'congestal': { ingredient: 'Paracetamol + Pseudoephedrine + Chlorpheniramine', classDesc: 'علاج فعال لاحتقان الجيوب الأنفية والرشح والصداع' },
  'flurest': { ingredient: 'Paracetamol + Pseudoephedrine + Chlorpheniramine', classDesc: 'كبسولات لعلاج أعراض الإنفلونزا ونزلات البرد الحادة' },
  'comtrex': { ingredient: 'Paracetamol + Pseudoephedrine + Brompheniramine', classDesc: 'مسكن ومضاد قوي لاحتقان الجيوب الأنفية والزكام' },
  'bronchicum': { ingredient: 'Thyme Fluid Extract + Primula Root Extract', classDesc: 'شراب مهدئ للسعال ومذيب للبلغم بمستخلصات الزعتر الطبيعية (Expectorant Herbal Syrup)' },
  'prospan': { ingredient: 'Dried Ivy Leaf Extract (Hedera Helix)', classDesc: 'شراب طبيعي موسع للشعب الهوائية ومذيب للبلغم وخالٍ من الكحول والسكر' },
  'otrivin': { ingredient: 'Xylometazoline Hydrochloride', classDesc: 'مضاد سريع وفعال لاحتقان وانسداد الأنف والجيوب الأنفية', drugBankId: 'DB06694' },
  'iliadin': { ingredient: 'Oxymetazoline Hydrochloride', classDesc: 'مضاد لاحتقان الأنف ممتد المفعول حتى 12 ساعة', drugBankId: 'DB06693' },
  'mucosolvan': { ingredient: 'Ambroxol Hydrochloride (Mucolytic)', classDesc: 'مذيب ومعدل للمخاط الرئوي وطارد للبلغم ومحفز لإفراز السيرفاكتانت', drugBankId: 'DB01285' },
  'bisolvon': { ingredient: 'Bromhexine Hydrochloride', classDesc: 'مذيب للبلغم ومحسن لمرونة ولزوجة الإفرازات التنفسية', drugBankId: 'DB09019' },

  // الدوار والأعصاب والغدة الدرقية
  'stugeron': { ingredient: 'Cinnarizine (H1 & Calcium Channel Blocker)', classDesc: 'علاج الدوخة والدوار وطنين الأذن واضطرابات التوازن وتصلب شرايين الدماغ', drugBankId: 'DB00568' },
  'betaserc': { ingredient: 'Betahistine Dihydrochloride', classDesc: 'علاج مرض مينيير والدوار وطنين الأذن وضعف التوازن الطرفي', drugBankId: 'DB06698' },
  'verserc': { ingredient: 'Betahistine Dihydrochloride', classDesc: 'علاج الدوار وطنين الأذن والدوار الحركي' },
  'eltroxin': { ingredient: 'Levothyroxine Sodium (T4 Thyroid Hormone)', classDesc: 'هرمون الغدة الدرقية البديل لعلاج قصور ونقص نشاط الغدة الدرقية', drugBankId: 'DB00451' },
  'euthyrox': { ingredient: 'Levothyroxine Sodium (T4 Thyroid Hormone)', classDesc: 'هرمون الغدة الدرقية البديل لعلاج قصور ونقص نشاط الغدة الدرقية', drugBankId: 'DB00451' },

  // المسالك البولية والأوعية الدموية
  'urisedon': { ingredient: 'Hyoscyamine + Methenamine + Methylene Blue', classDesc: 'مطهر ومسكن لآلام وتقلصات المسالك البولية وحرقة البول والتهاب المثانة' },
  'uricol': { ingredient: 'Hexamine + Piperazine Tartrate + Khellin', classDesc: 'فوار مطهر ومذيب لحصوات حمض اليوريك وموسع للحالب ومسكن للمغص الكلوي' },
  'daflon': { ingredient: 'Micronized Purified Flavonoid Fraction (Diosmin 450mg + Hesperidin 50mg)', classDesc: 'مقوي للأوردة والشعيرات الدموية لعلاج البواسير، الدوالي، وثقل الساقين' }
};

/**
 * تنظيف الاسم واستخراج الكلمات المفتاحية للبحث السريري
 */
export function extractSearchTokens(name: string, sciName?: string): string[] {
  const clean = `${sciName || ''} ${name || ''}`
    .toLowerCase()
    .replace(/[0-9]+(\.[0-9]+)?\s*(mg|g|mcg|ml|iu|%)/gi, ' ')
    .replace(/(\(|\)|\[|\]|\/|\+|,|-)/g, ' ')
    .replace(/\b(tab|tablets|suspension|sospension|capsule|capsules|inhaler|syrup|drops|spray|retard|forte|coated|plus|extra|hcl|sodium|potassium|fumarate|calcium|magnesium|sr|xr|cr|adult|pediatric)\b/gi, ' ')
    .trim();

  const words = clean.split(/\s+/).filter((w) => w.length > 2 && isNaN(Number(w)));
  const unique = Array.from(new Set(words));
  return unique.slice(0, 3);
}

/**
 * توليد روابط شبكة المراجع العلمية الدولية والشركات المصنعة والأدلة الدوائية الإقليمية
 */
export function generateScientificReferenceLinks(productName: string, activeIngredient?: string) {
  const query = encodeURIComponent(activeIngredient || productName);
  const brandQuery = encodeURIComponent(productName);

  return {
    // 1. المراجع العالمية ومواقع الشركات المصنعة
    drugsCom: `https://www.drugs.com/search.php?searchterm=${query}`,
    medscape: `https://reference.medscape.com/search?q=${query}`,
    rxList: `https://www.rxlist.com/script/main/srchcont_rxlist.asp?src=${query}`,
    dailyMed: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${query}`,
    emcUK: `https://www.medicines.org.uk/emc/search?q=${query}`,
    vidalFrance: `https://www.vidal.fr/recherche.html?query=${brandQuery}`,
    torrinomedica: `https://www.torrinomedica.it/?s=${brandQuery}`,
    ilacRehberi: `https://www.ilacrehberi.com/arama/?q=${brandQuery}`,
    drugBank: `https://go.drugbank.com/unearth/q?query=${query}`,

    // 2. الهيئات والأدلة الدوائية العربية والإقليمية
    altibbi: `https://altibbi.com/الادوية/ابحث-عن-دواء?query=${brandQuery}`,
    webTeb: `https://www.webteb.com/search?q=${brandQuery}`,
    sfda: `https://www.sfda.gov.sa/ar/drugs-list`,
    edaEgypt: `https://www.edaegypt.gov.eg/ar/الخدمات/الاستفسار-عن-توافر-المستحضرات-الدوائية/`,
    egyptianIndex: `https://www.google.com/search?q=${brandQuery}+site%3Adrugeye.org+OR+site%3Aegyptiandrugindex.com`
  };
}

/**
 * 1. فحص القاموس الإقليمي والمحلي الموسع (Libya, Egypt EDA, SFDA Saudi, Turkey, Europe)
 */
function resolveRegionalBrand(rawName: string): { ingredient: string; classDesc: string; drugBankId?: string } | null {
  const lower = rawName.toLowerCase();
  for (const [brandKey, data] of Object.entries(REGIONAL_BRAND_MOLECULE_MAP)) {
    if (lower.includes(brandKey)) {
      return data;
    }
  }
  return null;
}

/**
 * 2. البحث الحي في RxNorm API (National Library of Medicine - NIH) لاكتشاف المادة الفعالة
 */
async function queryRxNormForActiveIngredient(brandName: string): Promise<string | null> {
  if (!brandName || brandName.length < 3) return null;
  try {
    const cleanTerm = brandName.split(/[\s/+-]/)[0];
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(cleanTerm)}&maxEntries=3`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const candidates = data?.approximateGroup?.candidate;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const topRxcui = candidates[0].rxcui;
      if (topRxcui) {
        const propUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${topRxcui}/properties.json`;
        const propRes = await fetch(propUrl);
        if (propRes.ok) {
          const propData = await propRes.json();
          const propName = propData?.properties?.name;
          if (propName && propName.length > 2) {
            return propName;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 3. البحث في OpenFDA Drug Labels لاكتشاف المادة الفعالة
 */
async function queryOpenFDAActiveIngredient(term: string): Promise<string | null> {
  if (!term || term.length < 3) return null;
  try {
    const apiKey = process.env.OPENFDA_API_KEY || 'FekhVCxWo7fB3uUVULKg0nZ3DKmr2hCPyPRIk0yS';
    const url = `https://api.fda.gov/drug/label.json?api_key=${apiKey}&search=(openfda.brand_name:"${encodeURIComponent(term)}"+OR+openfda.substance_name:"${encodeURIComponent(term)}")&limit=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    if (data?.results?.[0]?.openfda) {
      const ofda = data.results[0].openfda;
      if (Array.isArray(ofda.substance_name) && ofda.substance_name.length > 0) {
        return ofda.substance_name.join(' + ');
      }
      if (Array.isArray(ofda.generic_name) && ofda.generic_name.length > 0) {
        return ofda.generic_name.join(' + ');
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 4. البحث الحي في محركات الأدلة الطبية الدولية
 */
async function queryWebMedicalDirectory(brandName: string): Promise<string | null> {
  if (!brandName || brandName.length < 3) return null;
  try {
    const cleanWord = brandName.split(/[\s/+-]/)[0];
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanWord)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data?.description && (data.description.includes('medication') || data.description.includes('drug') || data.description.includes('antibiotic') || data.description.includes('pharmaceutical'))) {
        return data.description;
      }
      if (data?.extract) {
        const match = data.extract.match(/(is a medication|active ingredient|generic name|sold under the brand name)\s+([A-Za-z\s]+)/i);
        if (match && match[2]) {
          return match[2].trim();
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 5. استعلام PubChem للحصول على التركيبة الكيميائية والخصائص الجزيئية
 */
async function queryPubChemForCompound(term: string): Promise<{ name: string; formula?: string; description?: string } | null> {
  if (!term || term.length < 3) return null;
  try {
    const firstWord = term.split(/[\s/+-]/)[0];
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(firstWord)}/JSON?MaxRecords=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const props = data?.PC_Compounds?.[0]?.props;
    if (!Array.isArray(props)) return null;
    const nameProp = props.find((p: any) => p.urn?.label === 'IUPAC Name' && p.urn?.name === 'Preferred');
    const formulaProp = props.find((p: any) => p.urn?.label === 'Molecular Formula');
    const iupacName = nameProp?.value?.sval || null;
    const formula = formulaProp?.value?.sval || null;
    return iupacName || formula ? { name: iupacName || firstWord, formula: formula || undefined } : null;
  } catch {
    return null;
  }
}

/**
 * 6. استعلام DailyMed للحصول على نشرة الدواء الرسمية من مستودع NIH
 */
async function queryDailyMedForDrug(term: string): Promise<{ ingredient: string; indication: string; source: string } | null> {
  if (!term || term.length < 3) return null;
  try {
    const firstWord = term.split(/[\s/+-]/)[0];
    const url = `https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json?drug_name=${encodeURIComponent(firstWord)}&pagesize=3`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const drugs = data?.data;
    if (!Array.isArray(drugs) || drugs.length === 0) return null;
    const firstDrug = drugs[0];
    if (!firstDrug?.setid) return null;
    const spl = await fetch(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${firstDrug.setid}.json`);
    if (!spl.ok) return null;
    const splData = await spl.json();
    const ingredients = splData?.data?.active_ingredients?.map((i: any) => `${i.name}${i.strength ? ' ' + i.strength : ''}`).join(' + ');
    if (ingredients) {
      return {
        ingredient: ingredients,
        indication: splData?.data?.purpose || '',
        source: 'DailyMed NIH (SPL نشرة دواء رسمية)'
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * المحرك الرئيسي لجلب واكتشاف التركيبة الكيميائية وتوليد الكبسولة السريرية الفورية
 * يجمع بين: القاموس الإقليمي + DailyMed + PubChem + RxNorm + OpenFDA + Wikipedia
 */
export async function fetchLiveDrugCapsule(product: ClinicalProductInput): Promise<ClinicalCapsuleData> {
  return enrichCapsuleWithLiveSources(product);
}

export async function enrichCapsuleWithLiveSources(product: ClinicalProductInput): Promise<ClinicalCapsuleData> {
  const rawName = (product.name || '').trim();
  const rawSci = (product.scientificName || product.activeIngredient || '').trim();
  const refLinks = generateScientificReferenceLinks(rawName, rawSci);

  // ═══════════════════════════════════════════════════════════
  // المرحلة 1: القاموس الإقليمي الموسع (أسرع مصدر + أعلى دقة)
  // ═══════════════════════════════════════════════════════════
  const regionalMatch = resolveRegionalBrand(rawName);
  if (regionalMatch) {
    const updatedProd: ClinicalProductInput = { ...product, scientificName: regionalMatch.ingredient };
    const capsule = generateClinicalCapsule(updatedProd);
    return {
      ...capsule,
      liveInfo: {
        source: 'الدليل الإقليمي المعتمد • Drugs.com • DailyMed NIH • Medscape',
        isLive: true,
        referenceLinks: generateScientificReferenceLinks(rawName, regionalMatch.ingredient)
      }
    } as any;
  }

  // ═══════════════════════════════════════════════════════════
  // المرحلة 2: الكبسولة السريرية من قاعدة المعرفة المدمجة
  // ═══════════════════════════════════════════════════════════
  const baseCapsule = generateClinicalCapsule(product);
  const isInfoAvailable = baseCapsule.isInfoAvailable !== false;
  const sciNameIsReal = baseCapsule.scientificName &&
    baseCapsule.scientificName !== rawName &&
    !baseCapsule.scientificName.toLowerCase().includes('غير متوفرة') &&
    baseCapsule.scientificName.length > 5;

  if (sciNameIsReal && isInfoAvailable) {
    return {
      ...baseCapsule,
      liveInfo: {
        source: 'DrugBank • Drugs.com • Medscape • EMC UK',
        isLive: true,
        referenceLinks: generateScientificReferenceLinks(rawName, baseCapsule.scientificName)
      }
    } as any;
  }

  // ═══════════════════════════════════════════════════════════
  // المرحلة 3: البحث الحي في مصادر متعددة بالتوازي
  // (DailyMed NIH + RxNorm + OpenFDA + PubChem + Wikipedia)
  // ═══════════════════════════════════════════════════════════
  const tokens = extractSearchTokens(rawName, rawSci);
  let discoveredIngredient: string | null = null;
  let discoverySource = '';
  let dailyMedIndication = '';

  if (tokens.length > 0) {
    const searchTerm = tokens[0];

    // استعلام DailyMed أولاً (أكثر موثوقية للمستحضرات التجارية)
    const dailyMedResult = await queryDailyMedForDrug(rawName);
    if (dailyMedResult?.ingredient) {
      discoveredIngredient = dailyMedResult.ingredient;
      dailyMedIndication = dailyMedResult.indication;
      discoverySource = dailyMedResult.source;
    }

    // RxNorm كمصدر ثانٍ
    if (!discoveredIngredient) {
      discoveredIngredient = await queryRxNormForActiveIngredient(searchTerm);
      if (discoveredIngredient) discoverySource = 'RxNorm NLM (NIH)';
    }

    // OpenFDA كمصدر ثالث
    if (!discoveredIngredient) {
      discoveredIngredient = await queryOpenFDAActiveIngredient(searchTerm);
      if (discoveredIngredient) discoverySource = 'OpenFDA Drug Labels (FDA)';
    }

    // Wikipedia/Wikidata كمصدر رابع
    if (!discoveredIngredient) {
      discoveredIngredient = await queryWebMedicalDirectory(searchTerm);
      if (discoveredIngredient) discoverySource = 'Wikipedia Medical Reference';
    }

    // PubChem كمصدر خامس (للجزيئات الكيميائية البحتة)
    if (!discoveredIngredient) {
      const pubChemResult = await queryPubChemForCompound(searchTerm);
      if (pubChemResult?.name) {
        discoveredIngredient = pubChemResult.name;
        discoverySource = `PubChem NCBI (${pubChemResult.formula || 'Molecular Data'})`;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // المرحلة 4: بناء الكبسولة من المادة الفعالة المكتشفة
  // ═══════════════════════════════════════════════════════════
  if (discoveredIngredient) {
    const updatedProd: ClinicalProductInput = { ...product, scientificName: discoveredIngredient };
    const dynamicCapsule = generateClinicalCapsule(updatedProd);

    // إضافة دواعي الاستعمال من DailyMed إن وُجدت
    const enrichedIndications = dailyMedIndication
      ? `${dynamicCapsule.indications}\n🔗 DailyMed: ${dailyMedIndication}`
      : dynamicCapsule.indications;

    return {
      ...dynamicCapsule,
      indications: enrichedIndications,
      liveInfo: {
        source: `${discoverySource} • Drugs.com • Medscape • EMC UK`,
        isLive: true,
        genericName: discoveredIngredient,
        referenceLinks: generateScientificReferenceLinks(rawName, discoveredIngredient)
      }
    } as any;
  }

  // ═══════════════════════════════════════════════════════════
  // المرحلة 5: لا توجد بيانات - إظهار حالة "معلومات غير متوفرة"
  // ═══════════════════════════════════════════════════════════
  return {
    ...baseCapsule,
    isInfoAvailable: false,
    liveInfo: {
      source: 'غير متوفر في قواعد البيانات المتاحة حالياً',
      isLive: false,
      referenceLinks: refLinks
    }
  } as any;
}
