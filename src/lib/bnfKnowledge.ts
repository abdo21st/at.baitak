/**
 * 🇬🇧 British National Formulary (BNF 83) Clinical Knowledge Engine
 * Joint Formulary Committee & Pharmaceutical Press (March 2022) / NICE UK
 * 
 * High-Performance O(1) Indexed Clinical Engine
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

// Pre-computed O(1) Lookup Maps and Normalized Keys
const BNF_KEYS = Object.keys(bnfDatabase);
const BNF_MAP = new Map<string, BnfMonograph>();

for (const key of BNF_KEYS) {
  const normalized = key.toLowerCase().trim();
  BNF_MAP.set(normalized, bnfDatabase[key]);
}

/**
 * البحث السريع الفائق O(1) في قاعدة بيانات الدليل الدوائي البريطاني BNF 83
 */
export function queryBnfMonograph(term: string): BnfMonograph | null {
  if (!term || typeof term !== 'string') return null;
  const clean = term.trim().toLowerCase();
  
  // 1. بحث مباشر O(1) بالمفتاح
  if (BNF_MAP.has(clean)) {
    return BNF_MAP.get(clean) || null;
  }

  // 2. بحث في تفكيك الأسماء المركبة O(1) per token
  const tokens = clean.split(/[\s,+/_-]+/);
  for (const token of tokens) {
    if (token.length >= 4 && BNF_MAP.has(token)) {
      return BNF_MAP.get(token) || null;
    }
  }

  // 3. بحث جزئي سريع بالكلمات المفتاحية
  for (let i = 0; i < BNF_KEYS.length; i++) {
    const key = BNF_KEYS[i];
    const keyLower = key.toLowerCase();
    if ((key.length >= 4 && clean.includes(keyLower)) || (clean.length >= 4 && keyLower.includes(clean))) {
      return bnfDatabase[key];
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
