/**
 * 🇬🇧 British National Formulary (BNF 83) Clinical Knowledge Engine
 * Joint Formulary Committee & Pharmaceutical Press (March 2022) / NICE UK
 * 
 * Provides validated British clinical monographs:
 * - Approved UK Indications & Dosages
 * - Cautions & Absolute Contraindications
 * - Renal & Hepatic Impairment Dose Adjustments
 * - Pregnancy & Breastfeeding Guidance
 * - Cautionary Dispensing Labels & Patient Advice
 */

import bnfDataRaw from '@/data/bnf_knowledge.json';

export interface BnfMonograph {
  drugName: string;
  bnfPage: number;
  edition: string;
  indicationsAndDose: string;
  cautions: string;
  contraindications: string;
  renalImpairment?: string;
  hepaticImpairment?: string;
  pregnancyAndLactation?: string;
  sideEffects?: string;
  patientAdvice?: string;
  source: string;
}

const bnfDatabase: Record<string, BnfMonograph> = (bnfDataRaw || {}) as Record<string, BnfMonograph>;

/**
 * البحث في قاعدة بيانات الدليل الدوائي البريطاني BNF 83
 */
export function queryBnfMonograph(term: string): BnfMonograph | null {
  if (!term || typeof term !== 'string') return null;
  const clean = term.trim().toLowerCase();
  
  // 1. بحث مباشر بالمفتاح
  if (bnfDatabase[clean]) {
    return bnfDatabase[clean];
  }

  // 2. بحث بالكلمات المفتاحية
  const keys = Object.keys(bnfDatabase);
  for (const key of keys) {
    if (clean.includes(key) || key.includes(clean)) {
      return bnfDatabase[key];
    }
  }

  // 3. بحث في تفكيك الأسماء المركبة
  const tokens = clean.split(/[\s,+/_-]+/);
  for (const token of tokens) {
    if (token.length >= 4 && bnfDatabase[token]) {
      return bnfDatabase[token];
    }
  }

  return null;
}

/**
 * توليد روابط التوثيق المباشرة من BNF NICE UK
 */
export function generateBnfReferenceLinks(drugName: string) {
  const cleanName = drugName.trim().toLowerCase().replace(/[^\w-]/g, '-');
  return {
    bnfNiceDirect: `https://bnf.nice.org.uk/drugs/${cleanName}/`,
    bnfSearch: `https://bnf.nice.org.uk/search/?q=${encodeURIComponent(drugName)}`,
    niceGuidance: `https://www.nice.org.uk/guidance/conditions-and-diseases`,
    emcSummary: `https://www.medicines.org.uk/emc/search?q=${encodeURIComponent(drugName)}`
  };
}
