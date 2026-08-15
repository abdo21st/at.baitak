export interface ClassifiedProductInfo {
  category: 'MEDICINES' | 'MOTHER_BABY' | 'COSMETICS_CARE' | 'MEDICAL_EQUIPMENT' | 'SUPPLEMENTS' | 'OTHER';
  categoryArabic: string;
  subCategory: string;
  activeIngredient?: string;
  strength?: string;
  dosageForm?: string;
  genericGroupId?: string;
  targetOrganSystem?: string;
  prescriptionRequired?: boolean;
}

// 1. Therapeutic & Medical Molecule Patterns
const MOLECULE_PATTERNS: Array<{
  pattern: RegExp;
  activeIngredient: string;
  subCategory: string;
  targetOrganSystem: string;
  prescriptionRequired?: boolean;
}> = [
  // Antibiotics & Anti-infectives
  { pattern: /AMOXICILLIN|AUGMENTIN|CURAM|MEGAMOX|AMOCLAN|JULMENTIN/i, activeIngredient: 'Amoxicillin + Clavulanate', subCategory: 'مضادات حيوية واسعة المجال', targetOrganSystem: 'الجهاز المناعي / العدوى', prescriptionRequired: true },
  { pattern: /CEFTRIAXONE|ROCEPHIN|CEFTREX/i, activeIngredient: 'Ceftriaxone', subCategory: 'مضادات حيوية - سيفالوسبورين', targetOrganSystem: 'الجهاز المناعي / العدوى', prescriptionRequired: true },
  { pattern: /CEFIXIME|SUPRAX|CEFIX/i, activeIngredient: 'Cefixime', subCategory: 'مضادات حيوية - سيفالوسبورين', targetOrganSystem: 'الجهاز المناعي / العدوى', prescriptionRequired: true },
  { pattern: /AZITHROMYCIN|ZITHROMAX|AZOMYCIN/i, activeIngredient: 'Azithromycin', subCategory: 'مضادات حيوية - ماكروليد', targetOrganSystem: 'الجهاز التنفسي / العدوى', prescriptionRequired: true },
  { pattern: /CIPROFLOXACIN|CIPROXIN|CIPRO/i, activeIngredient: 'Ciprofloxacin', subCategory: 'مضادات حيوية - فلوروكينولون', targetOrganSystem: 'المسالك البولية / العدوى', prescriptionRequired: true },
  { pattern: /METRONIDAZOLE|FLAGYL/i, activeIngredient: 'Metronidazole', subCategory: 'مضادات طفيليات وبكتيريا لا هوائية', targetOrganSystem: 'الجهاز الهضمي / العدوى', prescriptionRequired: true },
  { pattern: /CLARITHROMYCIN|KLACID/i, activeIngredient: 'Clarithromycin', subCategory: 'مضادات حيوية - ماكروليد', targetOrganSystem: 'الجهاز التنفسي / الهضمي', prescriptionRequired: true },

  // Cardiovascular & Hypertension (القلب والضغط)
  { pattern: /ZESTRIL|LISINOPRIL/i, activeIngredient: 'Lisinopril', subCategory: 'أدوية الضغط - مثبطات ACE', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /VASTAREL|TRIMETAZIDINE/i, activeIngredient: 'Trimetazidine', subCategory: 'أدوية الذبحة الصدرية وتحسين تروية القلب', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /BENALAPRIL|ENALAPRIL/i, activeIngredient: 'Enalapril', subCategory: 'أدوية الضغط - مثبطات ACE', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /LOXEN|NICARDIPINE/i, activeIngredient: 'Nicardipine', subCategory: 'أدوية الضغط - مغلقات قنوات الكالسيوم', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /FLUDEX|INDAPAMIDE/i, activeIngredient: 'Indapamide', subCategory: 'مدرات البول وضغط الدم', targetOrganSystem: 'القلب والأوعية والضغط', prescriptionRequired: true },
  { pattern: /APROVEL|IRBESARTAN/i, activeIngredient: 'Irbesartan', subCategory: 'أدوية الضغط - حاصرات ARB', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /ATACAND|CANDESARTAN/i, activeIngredient: 'Candesartan', subCategory: 'أدوية الضغط - حاصرات ARB', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /SIMVASTATIN|ZOCOR/i, activeIngredient: 'Simvastatin', subCategory: 'أدوية الكوليسترول والدهون الثلاثية', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /ATORVASTATIN|LIPITOR|ATOR/i, activeIngredient: 'Atorvastatin', subCategory: 'أدوية الكوليسترول والدهون الثلاثية', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /CONCOR|BISOPROLOL/i, activeIngredient: 'Bisoprolol', subCategory: 'أدوية الضغط ونبض القلب - حاصرات بيتا', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: true },
  { pattern: /ASPIRIN|JUSPRIN|ASPEGIC|ASPICOT/i, activeIngredient: 'Acetylsalicylic Acid (Aspirin)', subCategory: 'مسيلات الدم وحماية القلب', targetOrganSystem: 'القلب والأوعية الدموية', prescriptionRequired: false },

  // Diabetes & Endocrine (السكر والغدد)
  { pattern: /GLUCOPHAGE|METFORMIN|CIDOPHAGE/i, activeIngredient: 'Metformin', subCategory: 'أدوية السكري - منظم السكر', targetOrganSystem: 'الغدد الصماء والسكري', prescriptionRequired: true },
  { pattern: /GLIMEPIRIDE|AMARYL/i, activeIngredient: 'Glimepiride', subCategory: 'أدوية السكري - محفزات الإنسولين', targetOrganSystem: 'الغدد الصماء والسكري', prescriptionRequired: true },
  { pattern: /JANUVIA|SITAGLIPTIN/i, activeIngredient: 'Sitagliptin', subCategory: 'أدوية السكري - مثبطات DPP-4', targetOrganSystem: 'الغدد الصماء والسكري', prescriptionRequired: true },
  { pattern: /LANTUS|NOVORAPID|APIDRA|HUMALOG|INSULIN|MIXTARD/i, activeIngredient: 'Insulin (Various)', subCategory: 'إنسولين وبدائله', targetOrganSystem: 'الغدد الصماء والسكري', prescriptionRequired: true },
  { pattern: /ELTROXIN|EUTHYROX|LEVOTHYROXINE/i, activeIngredient: 'Levothyroxine', subCategory: 'هرمونات الغدة الدرقية', targetOrganSystem: 'الغدد الصماء', prescriptionRequired: true },

  // Analgesics, Pain & NSAIDs (المسكنات والالتهابات)
  { pattern: /PARACETAMOL|PANADOL|ADOL|DOLIPRANE|PARAMOL/i, activeIngredient: 'Paracetamol', subCategory: 'مسكنات وخافضات حرارة', targetOrganSystem: 'الجهاز العصبي المركزي', prescriptionRequired: false },
  { pattern: /IBUPROFEN|BRUFEN|PROFINAL/i, activeIngredient: 'Ibuprofen', subCategory: 'مسكنات ومضادات التهاب غير ستيرويدية', targetOrganSystem: 'العظام والمفاصل والمسكنات', prescriptionRequired: false },
  { pattern: /DICLOFENAC|VOLTAREN|CATAFLAM|DICLOGESIC|OLFEN/i, activeIngredient: 'Diclofenac', subCategory: 'مضادات التهاب ومسكنات قوية', targetOrganSystem: 'العظام والمفاصل والمسكنات', prescriptionRequired: false },
  { pattern: /MELOXICAM|MOVALIS/i, activeIngredient: 'Meloxicam', subCategory: 'مضادات التهاب المفاصل والروماتيزم', targetOrganSystem: 'العظام والمفاصل', prescriptionRequired: true },
  { pattern: /CELEBREX|CELECOXIB/i, activeIngredient: 'Celecoxib', subCategory: 'مسكنات ومضادات التهاب - مثبطات COX-2', targetOrganSystem: 'العظام والمفاصل', prescriptionRequired: true },

  // Gastrointestinal (الجهاز الهضمي والقولون)
  { pattern: /OMEPRAZOLE|LOSEC|GAZEC/i, activeIngredient: 'Omeprazole', subCategory: 'مثبطات مضخة البروتون - حموضة المعدة', targetOrganSystem: 'الجهاز الهضمي', prescriptionRequired: false },
  { pattern: /ESOMEPRAZOLE|NEXIUM/i, activeIngredient: 'Esomeprazole', subCategory: 'مثبطات مضخة البروتون - قرحة وحموضة', targetOrganSystem: 'الجهاز الهضمي', prescriptionRequired: false },
  { pattern: /PANTOPRAZOLE|CONTROLOC/i, activeIngredient: 'Pantoprazole', subCategory: 'مثبطات مضخة البروتون - حموضة المعدة', targetOrganSystem: 'الجهاز الهضمي', prescriptionRequired: false },
  { pattern: /MOTILIUM|DOMPERIDONE/i, activeIngredient: 'Domperidone', subCategory: 'مضادات القيء والغثيان وتنظيم حركة المعدة', targetOrganSystem: 'الجهاز الهضمي', prescriptionRequired: false },
  { pattern: /DUSPATALIN|MEBEVERINE/i, activeIngredient: 'Mebeverine', subCategory: 'علاج تشنجات وتهيج القولون العصبي', targetOrganSystem: 'الجهاز الهضمي والقولون', prescriptionRequired: false },

  // Respiratory & Antiallergic (الجهاز التنفسي والحساسية)
  { pattern: /VENTOLIN|SALBUTAMOL/i, activeIngredient: 'Salbutamol', subCategory: 'موسعات الشعب الهوائية وبخاخات الربو', targetOrganSystem: 'الجهاز التنفسي', prescriptionRequired: false },
  { pattern: /CETIRIZINE|ZYRTEC|HISTAZINE/i, activeIngredient: 'Cetirizine', subCategory: 'مضادات الهيستامين والحساسية', targetOrganSystem: 'الجهاز التنفسي والحساسية', prescriptionRequired: false },
  { pattern: /LORATADINE|CLARITINE/i, activeIngredient: 'Loratadine', subCategory: 'مضادات الهيستامين والحساسية', targetOrganSystem: 'الجهاز التنفسي والحساسية', prescriptionRequired: false },
  { pattern: /SINGULAIR|MONTELUKAST/i, activeIngredient: 'Montelukast', subCategory: 'علاج وقائي للربو وحساسية الصدر', targetOrganSystem: 'الجهاز التنفسي', prescriptionRequired: true }
];

// 2. Mother & Baby Products
const MOTHER_BABY_PATTERNS = [
  { pattern: /NAN\s*\d|APTAMIL|BEBELAC|S-26|SIMILAC|PRIMA|NOVALAC|NURSIE|NIDO/i, subCategory: 'حليب وأغذية الأطفال' },
  { pattern: /PAMPERS|HUGGIES|MOLFIX|CANBEBE|FINE\s*BABY|حفاض/i, subCategory: 'حفاضات الأطفال والعناية' },
  { pattern: /AVENT|CHICCO|NUK|PIGEON|BOTTLE|NIPPLE|PACIFIER|رضاعة|لهاية/i, subCategory: 'رضّاعات ومستلزمات تغذية الرضع' },
  { pattern: /SUDOCREM|BEPANTHEN\s*BABY|MUSTELA|SEBAMED\s*BABY|BABY\s*WIPES|مناديل\s*أطفال/i, subCategory: 'العناية ببشرة وجسم الطفل' }
];

// 3. Cosmetics, Skin & Personal Care
const COSMETICS_PATTERNS = [
  { pattern: /SUNBLOCK|SUNSCREEN|SPF|LAROCHE|AVENE|VICHY|BIODERMA|CERAVE|واقي\s*شمس/i, subCategory: 'واقيات الشمس وعناية متخصصة بالبشرة' },
  { pattern: /SHAMPOO|CONDITIONER|HAIR|SERUM|DANDRUFF|شامبو|بلسم|سيروم/i, subCategory: 'العناية بالشعر وفروة الرأس' },
  { pattern: /TOOTHPASTE|SENSODYNE|ORAL-B|COLGATE|MOUTHWASH|معجون\s*أسنان|فرشاة/i, subCategory: 'العناية بالفم والأسنان' },
  { pattern: /DEODORANT|BODY\s*LOTION|CREAM|MOISTURIZER|مرطب|لوشن|مزيل\s*عرق/i, subCategory: 'العناية بالجسم والترطيب' }
];

// 4. Medical Devices & Supplies
const MEDICAL_DEVICE_PATTERNS = [
  { pattern: /OMRON|BEURER|PRESSURE\s*MONITOR|BLOOD\s*PRESSURE|جهاز\s*ضغط/i, subCategory: 'أجهزة قياس ضغط الدم' },
  { pattern: /ACCU-CHEK|CONTOUR|ONE\s*TOUCH|GLUCOSE|STRIPS|جهاز\s*سكر|شرائط\s*سكر/i, subCategory: 'أجهزة وشرائط فحص السكري' },
  { pattern: /NEBULIZER|THERMOMETER|حرارة|ميزان\s*حرارة|جهاز\s*بخار/i, subCategory: 'أجهزة البخار والحرارة' },
  { pattern: /GAUZE|BANDAGE|PLASTER|SYRINGE|NEEDLE|GLOVES|شاش|شاش\s*طبي|ضماد|حقن|قفازات/i, subCategory: 'الشاش والضمادات والمستلزمات الطبية' }
];

// 5. Vitamins & Dietary Supplements
const SUPPLEMENTS_PATTERNS = [
  { pattern: /VITAMIN\s*C|VITAMIN\s*D|OMEGA|ZINC|IRON|CALCIUM|MULTIVITAMIN|COLLAGEN|BIOTIN|فيتامين|كالسيوم|حديد|أوميغا/i, subCategory: 'فيتامينات ومعادن ومكملات غذائية' }
];

// Helper: Extract Strength
function extractStrength(name: string): string | undefined {
  const match = name.match(/(\d+(?:\.\d+)?\s*(?:MG|G|MCG|ML|IU|%|MG\/ML|MG\/5ML|TAB|CAP))/i);
  return match ? match[1].toUpperCase() : undefined;
}

// Helper: Extract Dosage Form
function extractDosageForm(name: string): string | undefined {
  if (/TAB|TABLET|قرص|أقراص/i.test(name)) return 'أقراص (Tablets)';
  if (/CAP|CAPSULE|كبسول/i.test(name)) return 'كبسولات (Capsules)';
  if (/SYR|SYRUP|SUSP|شراب|معلق/i.test(name)) return 'شراب / معلق (Syrup)';
  if (/INJ|AMP|VIAL|حقن|أمبول/i.test(name)) return 'حقن (Injections)';
  if (/CREAM|OINT|GEL|مرهم|كريم|جل/i.test(name)) return 'كريم / مرهم (Topical)';
  if (/DROP|EYE\s*DROP|EAR\s*DROP|قطرة/i.test(name)) return 'قطرات (Drops)';
  if (/SPRAY|INHALER|بخاخ/i.test(name)) return 'بخاخ / رذاذ (Spray)';
  if (/SUPP|تحاميل/i.test(name)) return 'تحاميل (Suppositories)';
  if (/SACHET|فوار|أكياس/i.test(name)) return 'أكياس فوار (Sachets)';
  return undefined;
}

/**
 * AI & Pattern Classifier Engine for Pharmacy Products
 */
export function classifyProduct(productName: string): ClassifiedProductInfo {
  const cleanName = productName.trim();
  const strength = extractStrength(cleanName);
  const dosageForm = extractDosageForm(cleanName);

  // 1. Check Mother & Baby
  for (const item of MOTHER_BABY_PATTERNS) {
    if (item.pattern.test(cleanName)) {
      return {
        category: 'MOTHER_BABY',
        categoryArabic: 'مستلزمات الأم والطفل',
        subCategory: item.subCategory,
        strength,
        dosageForm,
        prescriptionRequired: false
      };
    }
  }

  // 2. Check Cosmetics & Care
  for (const item of COSMETICS_PATTERNS) {
    if (item.pattern.test(cleanName)) {
      return {
        category: 'COSMETICS_CARE',
        categoryArabic: 'العناية بالجسم والتجميل',
        subCategory: item.subCategory,
        strength,
        dosageForm,
        prescriptionRequired: false
      };
    }
  }

  // 3. Check Medical Devices & Equipment
  for (const item of MEDICAL_DEVICE_PATTERNS) {
    if (item.pattern.test(cleanName)) {
      return {
        category: 'MEDICAL_EQUIPMENT',
        categoryArabic: 'المعدات والأجهزة والمستلزمات الطبية',
        subCategory: item.subCategory,
        strength,
        dosageForm,
        prescriptionRequired: false
      };
    }
  }

  // 4. Check Supplements
  for (const item of SUPPLEMENTS_PATTERNS) {
    if (item.pattern.test(cleanName)) {
      return {
        category: 'SUPPLEMENTS',
        categoryArabic: 'الفيتامينات والمكملات الغذائية',
        subCategory: item.subCategory,
        strength,
        dosageForm,
        prescriptionRequired: false
      };
    }
  }

  // 5. Check Therapeutic Drugs (Molecules)
  for (const item of MOLECULE_PATTERNS) {
    if (item.pattern.test(cleanName)) {
      const genericGroupId = `${item.activeIngredient.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${(strength || 'std').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      return {
        category: 'MEDICINES',
        categoryArabic: 'أدوية ومستحضرات علاجية',
        subCategory: item.subCategory,
        activeIngredient: item.activeIngredient,
        strength,
        dosageForm,
        genericGroupId,
        targetOrganSystem: item.targetOrganSystem,
        prescriptionRequired: item.prescriptionRequired ?? true
      };
    }
  }

  // Fallback / General Medicine
  return {
    category: 'MEDICINES',
    categoryArabic: 'أدوية ومستحضرات صيدلانية عامة',
    subCategory: 'مستحضرات صيدلانية متنوعة',
    strength,
    dosageForm,
    prescriptionRequired: false
  };
}
