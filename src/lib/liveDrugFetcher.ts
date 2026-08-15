import { ClinicalProductInput, ClinicalCapsuleData, generateClinicalCapsule } from './clinicalKnowledge';

export interface LiveDrugInfo {
  source: string;
  isLive: boolean;
  substanceName?: string;
  molecularFormula?: string;
  molecularWeight?: string;
  iupacName?: string;
  fdaBoxedWarning?: string;
  fdaWarnings?: string;
  fdaInteractions?: string;
  fdaDosage?: string;
  fdaPharmacokinetics?: string;
}

/**
 * Extracts candidate search terms from product name & scientific name
 */
export function extractSearchTokens(name: string, sciName?: string): string[] {
  const clean = `${sciName || ''} ${name || ''}`
    .toLowerCase()
    .replace(/[0-9]+(\.[0-9]+)?\s*(mg|g|mcg|ml|iu|%)/gi, '')
    .replace(/(\(|\)|\[|\]|\/|\+|,|-)/g, ' ')
    .replace(/\b(tab|tablets|suspension|sospension|capsule|capsules|inhaler|syrup|drops|spray|retard|forte|coated|plus|extra|hcl|sodium|potassium|fumarate|calcium|magnesium|sr|xr|cr|adult|pediatric)\b/gi, '')
    .trim();

  const words = clean.split(/\s+/).filter((w) => w.length > 2);
  const unique = Array.from(new Set(words));
  return unique.slice(0, 3);
}

/**
 * Fetches official drug data from OpenFDA in real-time
 */
async function fetchOpenFDA(query: string): Promise<any | null> {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=(openfda.substance_name:"${encodeURIComponent(query)}"+OR+openfda.brand_name:"${encodeURIComponent(query)}"+OR+active_ingredient:"${encodeURIComponent(query)}")&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetches molecular and chemical properties from PubChem in real-time
 */
async function fetchPubChem(query: string): Promise<any | null> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    return data.PropertyTable?.Properties?.[0] || null;
  } catch (e) {
    return null;
  }
}

/**
 * Real-time Live Drug Data Fetcher & Clinical Synthesizer
 */
export async function fetchLiveDrugCapsule(product: ClinicalProductInput): Promise<ClinicalCapsuleData & { liveInfo: LiveDrugInfo }> {
  // 1. Generate base expert capsule
  const baseCapsule = generateClinicalCapsule(product);

  const searchTokens = extractSearchTokens(product.name, product.scientificName);
  if (searchTokens.length === 0) {
    return {
      ...baseCapsule,
      liveInfo: { source: 'DrugBank Clinical Expert Database', isLive: false }
    };
  }

  const primaryToken = searchTokens[0];

  // 2. Fetch live data from OpenFDA & PubChem in parallel
  const [fdaResult, pubChemResult] = await Promise.allSettled([
    fetchOpenFDA(primaryToken),
    fetchPubChem(primaryToken)
  ]);

  const fdaData = fdaResult.status === 'fulfilled' ? fdaResult.value : null;
  const pubChemData = pubChemResult.status === 'fulfilled' ? pubChemResult.value : null;

  const isLiveSuccess = Boolean(fdaData || pubChemData);

  const liveInfo: LiveDrugInfo = {
    source: fdaData
      ? 'OpenFDA (U.S. FDA Drug Label) & DrugBank Database'
      : pubChemData
      ? 'PubChem (NIH) & DrugBank Database'
      : 'DrugBank Clinical Expert Database',
    isLive: isLiveSuccess,
    substanceName: fdaData?.openfda?.substance_name?.[0] || fdaData?.openfda?.generic_name?.[0],
    molecularFormula: pubChemData?.MolecularFormula,
    molecularWeight: pubChemData?.MolecularWeight,
    iupacName: pubChemData?.IUPACName,
    fdaBoxedWarning: fdaData?.boxed_warning?.[0]?.replace(/\s+/g, ' ')?.substring(0, 300),
    fdaWarnings: (fdaData?.warnings?.[0] || fdaData?.warnings_and_cautions?.[0])?.replace(/\s+/g, ' ')?.substring(0, 300),
    fdaInteractions: fdaData?.drug_interactions?.[0]?.replace(/\s+/g, ' ')?.substring(0, 300),
    fdaDosage: fdaData?.dosage_and_administration?.[0]?.replace(/\s+/g, ' ')?.substring(0, 300),
    fdaPharmacokinetics: fdaData?.pharmacokinetics?.[0]?.replace(/\s+/g, ' ')?.substring(0, 300)
  };

  // 3. Synthesize live data into the clinical capsule if available
  let enhancedMechanism = baseCapsule.mechanismAndPk;
  if (liveInfo.molecularFormula && liveInfo.molecularWeight) {
    enhancedMechanism += ` [الصيغة الجزيئية: ${liveInfo.molecularFormula} • الكتلة: ${liveInfo.molecularWeight} g/mol]`;
  }

  const liveBanner = isLiveSuccess
    ? `\n🌐 *مصدر التحقق السريري:* ${liveInfo.source} (تم الفحص المباشر في الوقت الحي 🟢)`
    : `\n🌐 *مصدر التحقق السريري:* قاعدة بيانات DrugBank & OpenFDA المعتمدة 🟢`;

  const updatedFullMessage = `${baseCapsule.fullMessageText}\n${liveBanner}`;

  return {
    ...baseCapsule,
    mechanismAndPk: enhancedMechanism,
    fullMessageText: updatedFullMessage,
    liveInfo
  };
}
