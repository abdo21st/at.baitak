/**
 * Pediatric Dosage Calculation Engine based on BNF 83 (March 2022) & NICE UK Guidelines
 */

export interface PediatricDrugProfile {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  activeIngredient: string;
  category: 'ANTIBIOTIC' | 'ANTIPYRETIC' | 'ANALGESIC' | 'ANTIHISTAMINE' | 'RESPIRATORY';
  concentrations: { label: string; mgPerMl: number }[];
  minAgeMonths: number;
  maxAgeYears: number;
  doseMgPerKgPerDay: number; // e.g. 50 mg/kg/day
  dosesPerDay: number;       // e.g. 3 times daily (every 8 hours)
  maxSingleDoseMg: number;
  maxDailyDoseMg: number;
  notes: string;
}

export const PEDIATRIC_DRUGS_DB: PediatricDrugProfile[] = [
  {
    id: 'amoxicillin',
    nameArabic: 'أموكسيسيلين شراب معلق (Amoxicillin)',
    nameEnglish: 'Amoxicillin Oral Suspension',
    activeIngredient: 'Amoxicillin',
    category: 'ANTIBIOTIC',
    concentrations: [
      { label: '125 mg / 5 ml (25 mg/ml)', mgPerMl: 25 },
      { label: '250 mg / 5 ml (50 mg/ml)', mgPerMl: 50 },
      { label: '400 mg / 5 ml (80 mg/ml)', mgPerMl: 80 }
    ],
    minAgeMonths: 1,
    maxAgeYears: 12,
    doseMgPerKgPerDay: 40,
    dosesPerDay: 3,
    maxSingleDoseMg: 500,
    maxDailyDoseMg: 1500,
    notes: 'الجرعة المعتادة لالتهاب الأذن الوسطى والتهاب الحلق: 40-90 ملغ/كغ/يوم مقسمة كل 8 ساعات.'
  },
  {
    id: 'augmentin',
    nameArabic: 'أوجمنتين / كلافيموكس (Amoxicillin / Clavulanic Acid)',
    nameEnglish: 'Co-amoxiclav Oral Suspension',
    activeIngredient: 'Amoxicillin + Clavulanic Acid',
    category: 'ANTIBIOTIC',
    concentrations: [
      { label: '156.25 mg / 5 ml (31.25 mg/ml)', mgPerMl: 31.25 },
      { label: '228.5 mg / 5 ml (45.7 mg/ml)', mgPerMl: 45.7 },
      { label: '312.5 mg / 5 ml (62.5 mg/ml)', mgPerMl: 62.5 },
      { label: '457 mg / 5 ml (91.4 mg/ml)', mgPerMl: 91.4 },
      { label: 'ES 600 mg / 5 ml (120 mg/ml)', mgPerMl: 120 }
    ],
    minAgeMonths: 2,
    maxAgeYears: 12,
    doseMgPerKgPerDay: 45,
    dosesPerDay: 2,
    maxSingleDoseMg: 875,
    maxDailyDoseMg: 2000,
    notes: 'يفضل تناوله في بداية الوجبات لتقليل الاضطرابات المعوية وتحسين الامتصاص.'
  },
  {
    id: 'paracetamol',
    nameArabic: 'باراسيتامول / أدول / باندول شراب (Paracetamol)',
    nameEnglish: 'Paracetamol Paediatric Suspension',
    activeIngredient: 'Paracetamol',
    category: 'ANTIPYRETIC',
    concentrations: [
      { label: '120 mg / 5 ml (24 mg/ml)', mgPerMl: 24 },
      { label: '250 mg / 5 ml (50 mg/ml)', mgPerMl: 50 }
    ],
    minAgeMonths: 2,
    maxAgeYears: 12,
    doseMgPerKgPerDay: 60, // 15 mg/kg per dose * 4
    dosesPerDay: 4,
    maxSingleDoseMg: 1000,
    maxDailyDoseMg: 2000,
    notes: 'الجرعة: 15 ملغ/كغ لكل جرعة كل 4 إلى 6 ساعات عند اللزوم (بحد أقصى 4 مرات يومياً).'
  },
  {
    id: 'ibuprofen',
    nameArabic: 'إيبوبروفين / بروفين شراب (Ibuprofen)',
    nameEnglish: 'Ibuprofen Paediatric Suspension',
    activeIngredient: 'Ibuprofen',
    category: 'ANTIPYRETIC',
    concentrations: [
      { label: '100 mg / 5 ml (20 mg/ml)', mgPerMl: 20 }
    ],
    minAgeMonths: 3,
    maxAgeYears: 12,
    doseMgPerKgPerDay: 30, // 10 mg/kg per dose * 3
    dosesPerDay: 3,
    maxSingleDoseMg: 400,
    maxDailyDoseMg: 1200,
    notes: 'الجرعة: 5-10 ملغ/كغ كل 8 ساعات بعد الرضاعة أو الطعام. يمنع في حالات الجفاف الشديد والربو النشط.'
  },
  {
    id: 'azithromycin',
    nameArabic: 'أزيثرومايسين / زيثروماكس شراب (Azithromycin)',
    nameEnglish: 'Azithromycin Oral Suspension',
    activeIngredient: 'Azithromycin',
    category: 'ANTIBIOTIC',
    concentrations: [
      { label: '200 mg / 5 ml (40 mg/ml)', mgPerMl: 40 }
    ],
    minAgeMonths: 6,
    maxAgeYears: 14,
    doseMgPerKgPerDay: 10,
    dosesPerDay: 1,
    maxSingleDoseMg: 500,
    maxDailyDoseMg: 500,
    notes: 'جرعة واحدة يومياً لمدة 3 إلى 5 أيام. يعطى قبل الأكل بساعة أو بعده بساعتين.'
  }
];

export interface CalculationResult {
  drugName: string;
  weightKg: number;
  selectedConcentration: string;
  singleDoseMg: number;
  singleDoseMl: number;
  dailyDoseMg: number;
  dailyDoseMl: number;
  frequencyText: string;
  durationDays: number;
  totalBottlesNeeded: number;
  notes: string;
}

export function calculatePediatricDose(
  drugId: string,
  weightKg: number,
  concentrationIndex: number = 0,
  durationDays: number = 5
): CalculationResult | null {
  const drug = PEDIATRIC_DRUGS_DB.find((d) => d.id === drugId);
  if (!drug || weightKg <= 0) return null;

  const conc = drug.concentrations[concentrationIndex] || drug.concentrations[0];
  
  // Calculate daily dose in mg
  let dailyDoseMg = weightKg * drug.doseMgPerKgPerDay;
  if (dailyDoseMg > drug.maxDailyDoseMg) dailyDoseMg = drug.maxDailyDoseMg;

  // Single dose in mg
  let singleDoseMg = dailyDoseMg / drug.dosesPerDay;
  if (singleDoseMg > drug.maxSingleDoseMg) singleDoseMg = drug.maxSingleDoseMg;

  // Convert to ml
  const singleDoseMl = Number((singleDoseMg / conc.mgPerMl).toFixed(1));
  const dailyDoseMl = Number((singleDoseMl * drug.dosesPerDay).toFixed(1));

  const totalMlNeeded = dailyDoseMl * durationDays;
  const standardBottleMl = 60; // default 60ml or 100ml bottle
  const totalBottlesNeeded = Math.ceil(totalMlNeeded / standardBottleMl);

  let frequencyText = '';
  if (drug.dosesPerDay === 1) frequencyText = 'مرة واحدة يومياً (كل 24 ساعة)';
  else if (drug.dosesPerDay === 2) frequencyText = 'مرتان يومياً (كل 12 ساعة)';
  else if (drug.dosesPerDay === 3) frequencyText = '3 مرات يومياً (كل 8 ساعات)';
  else if (drug.dosesPerDay === 4) frequencyText = '4 مرات يومياً (كل 6 ساعات)';

  return {
    drugName: drug.nameArabic,
    weightKg,
    selectedConcentration: conc.label,
    singleDoseMg: Math.round(singleDoseMg),
    singleDoseMl,
    dailyDoseMg: Math.round(dailyDoseMg),
    dailyDoseMl,
    frequencyText,
    durationDays,
    totalBottlesNeeded,
    notes: drug.notes
  };
}
