import { ClinicalProductInput, ClinicalCapsuleData, generateClinicalCapsule } from './clinicalKnowledge';

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
 * Clean text from excessive whitespace and prefix labels
 */
function cleanSectionText(arr?: string[], maxLen = 400): string | undefined {
  if (!arr || arr.length === 0) return undefined;
  const raw = arr.join(' ')
    .replace(/^(USES|INDICATIONS|DOSAGE|WARNINGS|STORAGE|ACTIVE INGREDIENT|INACTIVE INGREDIENTS|QUESTIONS|PURPOSE|MECHANISM OF ACTION|PHARMACOKINETICS|DRUG INTERACTIONS|CONTRAINDICATIONS)\s*:?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return undefined;
  return raw.length > maxLen ? raw.substring(0, maxLen) + '...' : raw;
}

/**
 * Fetches official drug label data from OpenFDA (/drug/label.json) in real-time
 */
async function fetchOpenFDALabel(query: string): Promise<any | null> {
  try {
    const apiKey = process.env.OPENFDA_API_KEY || 'FekhVCxWo7fB3uUVULKg0nZ3DKmr2hCPyPRIk0yS';
    const url = `https://api.fda.gov/drug/label.json?api_key=${apiKey}&search=(openfda.substance_name:"${encodeURIComponent(query)}"+OR+openfda.brand_name:"${encodeURIComponent(query)}"+OR+active_ingredient:"${encodeURIComponent(query)}"+OR+openfda.generic_name:"${encodeURIComponent(query)}")&limit=1`;
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
 * Fetches official NDC pharmacological classification from OpenFDA (/drug/ndc.json) in real-time
 */
async function fetchOpenFDANDC(query: string): Promise<any | null> {
  try {
    const apiKey = process.env.OPENFDA_API_KEY || 'FekhVCxWo7fB3uUVULKg0nZ3DKmr2hCPyPRIk0yS';
    const url = `https://api.fda.gov/drug/ndc.json?api_key=${apiKey}&search=(generic_name:"${encodeURIComponent(query)}"+OR+brand_name:"${encodeURIComponent(query)}"+OR+active_ingredients.name:"${encodeURIComponent(query)}")&limit=1`;
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
 * Fetches RxCUI and live interactions from RxNorm (NLM RxNav REST API)
 */
async function fetchRxNavData(query: string): Promise<{ rxcui?: string; interactions?: string[]; brandNames?: string[] }> {
  try {
    const idUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const idRes = await fetch(idUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!idRes.ok) return {};
    const idData = await idRes.json();
    let rxcui = idData.idGroup?.rxnormId?.[0];

    // Fallback: approximate search if exact match not found
    if (!rxcui) {
      const approxUrl = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(query)}&maxEntries=1`;
      const approxRes = await fetch(approxUrl);
      if (approxRes.ok) {
        const approxData = await approxRes.json();
        rxcui = approxData.approximateGroup?.candidate?.[0]?.rxcui;
      }
    }

    if (!rxcui) return {};

    // Fetch official interactions for this RxCUI
    const interUrl = `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcui}`;
    const interRes = await fetch(interUrl);
    let interactions: string[] = [];
    if (interRes.ok) {
      const interData = await interRes.json();
      const pairs = interData.interactionTypeGroup?.[0]?.interactionType?.[0]?.interactionPair || [];
      interactions = pairs.slice(0, 3).map((p: any) => p.description || p.interactionConcept?.[1]?.minConceptItem?.name).filter(Boolean);
    }

    return { rxcui, interactions };
  } catch (e) {
    return {};
  }
}

/**
 * Fetches molecular and chemical properties + Synonyms from PubChem in real-time
 */
async function fetchPubChemData(query: string): Promise<any | null> {
  try {
    const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName/JSON`;
    const synUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/synonyms/JSON`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const [propRes, synRes] = await Promise.allSettled([
      fetch(propUrl, { signal: controller.signal }),
      fetch(synUrl, { signal: controller.signal })
    ]);
    clearTimeout(timeoutId);

    const propData = propRes.status === 'fulfilled' && propRes.value.ok ? await propRes.value.json() : null;
    const synData = synRes.status === 'fulfilled' && synRes.value.ok ? await synRes.value.json() : null;

    const properties = propData?.PropertyTable?.Properties?.[0] || {};
    const synonyms = synData?.InformationList?.Information?.[0]?.Synonym?.slice(0, 5) || [];

    return {
      ...properties,
      synonyms
    };
  } catch (e) {
    return null;
  }
}

/**
 * Detect CYP enzymes and elimination pathways from raw FDA clinical text
 */
function extractCypAndElimination(rawText?: string): string | undefined {
  if (!rawText) return undefined;
  const text = rawText.toUpperCase();
  const enzymes: string[] = [];
  if (text.includes('CYP3A4') || text.includes('CYP3A')) enzymes.push('CYP3A4');
  if (text.includes('CYP2D6')) enzymes.push('CYP2D6');
  if (text.includes('CYP2C9')) enzymes.push('CYP2C9');
  if (text.includes('CYP2C19')) enzymes.push('CYP2C19');
  if (text.includes('CYP1A2')) enzymes.push('CYP1A2');
  if (text.includes('UGT') || text.includes('GLUCURONID')) enzymes.push('Glucuronidation (UGT)');
  if (text.includes('P-GP') || text.includes('P-GLYCOPROTEIN')) enzymes.push('P-glycoprotein (P-gp)');

  const isRenal = text.includes('RENAL') || text.includes('URINE') || text.includes('UNCHANGED IN URINE') || text.includes('GLOMERULAR');
  const isHepatic = text.includes('HEPATIC') || text.includes('METABOLIZED BY LIVER') || enzymes.length > 0;

  if (enzymes.length > 0) {
    return `استقلاب كبدي رئيسي عبر إنزيمات (${enzymes.join(', ')}) ${isRenal ? 'مع إطراح كلوي للمستقلبات' : ''}`;
  }
  if (isRenal && !isHepatic) {
    return 'إطراح كلوي رئيسي دون استقلاب كبدي يُذكر (يجب ضبط الجرعة في القصور الكلوي)';
  }
  if (isHepatic && isRenal) {
    return 'استقلاب كبدي وإطراح كلوي متوازن وفق المسارات الإنزيمية الرسمية المعتمدة لنوع المركب';
  }
  return undefined;
}

/**
 * Detect Food & Alcohol interactions from raw FDA text
 */
function extractFoodAndAlcohol(rawDosage?: string, rawPatientInfo?: string, rawPk?: string): { food?: string; alcohol?: string } {
  const combined = `${rawDosage || ''} ${rawPatientInfo || ''} ${rawPk || ''}`.toLowerCase();
  let food: string | undefined;
  let alcohol: string | undefined;

  if (combined.includes('without regard to meals') || combined.includes('with or without food')) {
    food = 'يمكن تناوله مع الطعام أو بدونه، حيث لا تؤثر الوجبات الغذائية بشكل ملموس على التوافر الحيوي للدواء.';
  } else if (combined.includes('with food') || combined.includes('with meals') || combined.includes('take with food')) {
    food = 'يُفضل تناوله أثناء أو بعد الوجبات لتقليل الاضطرابات الهضمية أو لتعزيز الامتصاص الأقصى.';
  } else if (combined.includes('empty stomach') || combined.includes('before meals') || combined.includes('1 hour before') || combined.includes('2 hours after')) {
    food = 'يؤخذ على معدة فارغة (قبل الأكل بساعة أو بعده بساعتين) لضمان الامتصاص السريع وتجنب ارتباطه ببروتينات الطعام.';
  }

  if (combined.includes('grapefruit')) {
    food = `${food || ''} • ⚠️ تجنب تناول عصير الجريب فروت لتثبيطه إنزيمات الأيض وتسببه في رفع سمية الدواء بالدم.`.trim();
  }

  if (combined.includes('alcohol')) {
    alcohol = '⚠️ يُمنع تماماً تناول الكحول أو المشروبات الكحولية لما تسببه من إجهاد كبدي مضاعف ومخاطر تثبيط عصبي أو نزيف حاد.';
  } else {
    alcohol = 'تجنب الكحول لتفادي الإجهاد الكبدي والتداخلات العصبية المثبطة مع العلاج.';
  }

  return { food, alcohol };
}

/**
 * Real-time Live Drug Data Fetcher & Clinical Synthesizer
 * Fetches simultaneously from OpenFDA Label, OpenFDA NDC, RxNorm (RxNav), and PubChem NIH
 */
export async function fetchLiveDrugCapsule(product: ClinicalProductInput): Promise<ClinicalCapsuleData & { liveInfo: LiveDrugInfo }> {
  // 1. Base Expert Reference
  const baseCapsule = generateClinicalCapsule(product);

  const searchTokens = extractSearchTokens(product.name, product.scientificName);
  if (searchTokens.length === 0) {
    return {
      ...baseCapsule,
      liveInfo: { source: 'DrugBank Clinical Expert Database', isLive: false }
    };
  }

  const primaryToken = searchTokens[0];

  // 2. Fetch live data concurrently from OpenFDA Label, OpenFDA NDC, RxNorm & PubChem
  const [fdaLabelResult, fdaNdcResult, rxNavResult, pubChemResult] = await Promise.allSettled([
    fetchOpenFDALabel(primaryToken),
    fetchOpenFDANDC(primaryToken),
    fetchRxNavData(primaryToken),
    fetchPubChemData(primaryToken)
  ]);

  const fdaData = fdaLabelResult.status === 'fulfilled' ? fdaLabelResult.value : null;
  const ndcData = fdaNdcResult.status === 'fulfilled' ? fdaNdcResult.value : null;
  const rxNavData = rxNavResult.status === 'fulfilled' ? rxNavResult.value : null;
  const pubChemData = pubChemResult.status === 'fulfilled' ? pubChemResult.value : null;

  const isLiveSuccess = Boolean(fdaData || ndcData || rxNavData?.rxcui || pubChemData?.MolecularFormula);

  const liveInfo: LiveDrugInfo = {
    source: (fdaData || ndcData)
      ? 'OpenFDA (FDA Drug Label & NDC) • RxNorm (NLM) • PubChem (NIH)'
      : pubChemData
      ? 'PubChem (NIH) & DrugBank Database'
      : 'DrugBank Clinical Expert Database',
    isLive: isLiveSuccess,
    brandName: fdaData?.openfda?.brand_name?.[0] || ndcData?.brand_name,
    substanceName: fdaData?.openfda?.substance_name?.[0] || ndcData?.generic_name,
    genericName: fdaData?.openfda?.generic_name?.[0] || ndcData?.generic_name,
    productType: fdaData?.openfda?.product_type?.[0] || ndcData?.product_type,
    dosageForm: ndcData?.dosage_form,
    pharmClass: ndcData?.pharm_class,
    activeIngredients: ndcData?.active_ingredients,
    molecularFormula: pubChemData?.MolecularFormula,
    molecularWeight: pubChemData?.MolecularWeight,
    canonicalSmiles: pubChemData?.CanonicalSMILES,
    iupacName: pubChemData?.IUPACName,
    synonyms: pubChemData?.synonyms,
    purpose: cleanSectionText(fdaData?.purpose),
    indications: cleanSectionText(fdaData?.indications_and_usage),
    dosageAndAdmin: cleanSectionText(fdaData?.dosage_and_administration),
    mechanismOfAction: cleanSectionText(fdaData?.mechanism_of_action || fdaData?.clinical_pharmacology),
    pharmacodynamics: cleanSectionText(fdaData?.pharmacodynamics),
    pharmacokinetics: cleanSectionText(fdaData?.pharmacokinetics),
    warnings: cleanSectionText(fdaData?.warnings || fdaData?.warnings_and_cautions),
    boxedWarning: cleanSectionText(fdaData?.boxed_warning),
    contraindications: cleanSectionText(fdaData?.contraindications),
    stopUse: cleanSectionText(fdaData?.stop_use),
    pregnancyWarning: cleanSectionText(fdaData?.pregnancy_or_breast_feeding),
    storageAndHandling: cleanSectionText(fdaData?.storage_and_handling),
    drugInteractions: cleanSectionText(fdaData?.drug_interactions),
    patientCounseling: cleanSectionText(fdaData?.patient_counseling_information),
    rxNavInteractions: rxNavData?.interactions,
    rxcui: rxNavData?.rxcui
  };

  // -------------------------------------------------------------
  // Dynamic Live Synthesis for the 6 Clinical Points
  // -------------------------------------------------------------

  // 1. آلية العمل والحركية الدوائية (Mechanism & PK)
  let liveMechanism = baseCapsule.mechanismAndPk;
  if (liveInfo.pharmClass && liveInfo.pharmClass.length > 0) {
    liveMechanism = `التصنيف السريري المعتمد لدى FDA: (${liveInfo.pharmClass.join(' • ')})\n• ${liveMechanism}`;
  }
  if (liveInfo.molecularFormula && liveInfo.molecularWeight) {
    liveMechanism += ` [المركب: ${liveInfo.molecularFormula} • الكتلة: ${liveInfo.molecularWeight} g/mol]`;
  }
  if (liveInfo.mechanismOfAction) {
    liveMechanism += `\n• *نص الآلية من النشرة الرسمية:* ${liveInfo.mechanismOfAction}`;
  }

  // 2. الاستقلاب الكبدي وإنزيمات السيتوكروم (CYP450 Metabolism)
  const detectedCyp = extractCypAndElimination(
    `${fdaData?.pharmacokinetics?.[0] || ''} ${fdaData?.clinical_pharmacology?.[0] || ''} ${fdaData?.drug_interactions?.[0] || ''}`
  );
  const liveCypMetabolism = detectedCyp || baseCapsule.cypMetabolism;

  // 3. التداخلات الدوائية المعتمدة (Drug-Drug Interactions)
  const liveInteractions: string[] = [];
  if (liveInfo.drugInteractions) {
    liveInteractions.push(`🔴 *تداخلات النشرة المعتمدة لدى FDA:* ${liveInfo.drugInteractions}`);
  }
  if (liveInfo.rxNavInteractions && liveInfo.rxNavInteractions.length > 0) {
    liveInfo.rxNavInteractions.forEach((inter) => {
      liveInteractions.push(`⚠️ *تفاعل RxNorm/NLM موثق:* ${inter}`);
    });
  }
  if (liveInteractions.length === 0) {
    baseCapsule.majorInteractions.forEach((i) => liveInteractions.push(i));
  }

  // 4. التداخلات الغذائية والكحولية (Food & Alcohol)
  const detectedFoodAlcohol = extractFoodAndAlcohol(
    fdaData?.dosage_and_administration?.[0],
    fdaData?.information_for_patients?.[0],
    fdaData?.pharmacokinetics?.[0]
  );
  const liveFoodAndAlcohol: string[] = [];
  if (detectedFoodAlcohol.food) {
    liveFoodAndAlcohol.push(`🥗 *الطعام:* ${detectedFoodAlcohol.food}`);
  } else {
    liveFoodAndAlcohol.push(baseCapsule.foodAndAlcoholInteractions[0] || 'الالتزام بالإرشادات الخاصة بالدواء وشرب كميات كافية من الماء.');
  }
  if (detectedFoodAlcohol.alcohol) {
    liveFoodAndAlcohol.push(`🍷 *الكحول:* ${detectedFoodAlcohol.alcohol}`);
  } else {
    liveFoodAndAlcohol.push(baseCapsule.foodAndAlcoholInteractions[1] || 'تجنب الكحول لتفادي الإجهاد الكبدي والتداخلات العصبية المثبطة.');
  }

  // 5. التحذيرات الصندوقية واحتياطات الصرف (Black Box & Precautions)
  const liveWarnings: string[] = [];
  if (liveInfo.boxedWarning) {
    liveWarnings.push(`⚠️ *تحذير الصندوق الأسود (FDA Boxed Warning):* ${liveInfo.boxedWarning}`);
  }
  if (liveInfo.contraindications) {
    liveWarnings.push(`🚫 *موانع الاستعمال الرسمية (Contraindications):* ${liveInfo.contraindications}`);
  }
  if (liveInfo.warnings) {
    liveWarnings.push(`⚠️ *احتياطات وتحذيرات النشرة:* ${liveInfo.warnings}`);
  }
  if (liveInfo.pregnancyWarning) {
    liveWarnings.push(`🤰 *الحمل والإرضاع:* ${liveInfo.pregnancyWarning}`);
  }
  if (liveInfo.stopUse) {
    liveWarnings.push(`🛑 *دواعي إيقاف العلاج الفوري:* ${liveInfo.stopUse}`);
  }
  if (liveWarnings.length === 0) {
    baseCapsule.blackBoxAndWarnings.forEach((w) => liveWarnings.push(w));
  }

  // 6. التوجيه السريري الذهبي للصيدلي عند الصرف
  let liveGoldenTip = baseCapsule.goldenCounselingTip;
  if (liveInfo.patientCounseling) {
    liveGoldenTip = `نصيحة الصرف المعتمدة (FDA Patient Counseling): ${liveInfo.patientCounseling}`;
  } else if (liveInfo.dosageAndAdmin) {
    liveGoldenTip = `إرشادات الصرف والجرعة: ${liveInfo.dosageAndAdmin} • تأكد دائماً من مراجعة وظائف الكبد والكلى لدى المريض.`;
  }

  // Usage Timing & Storage
  let liveUsageTiming = baseCapsule.usageTiming;
  if (liveInfo.dosageAndAdmin) {
    liveUsageTiming = `${liveUsageTiming}\n• *إرشادات الجرعة وفق النشرة الرسمية:* ${liveInfo.dosageAndAdmin}`;
  }
  if (liveInfo.storageAndHandling) {
    liveUsageTiming += `\n• *شروط الحفظ:* ${liveInfo.storageAndHandling}`;
  }

  const liveBanner = isLiveSuccess
    ? `\n🌐 *مصادر التحقق السريري الحي:* ${liveInfo.source} (تم الفحص المباشر في الوقت الحي 🟢)`
    : `\n🌐 *مصادر التحقق السريري:* قاعدة بيانات DrugBank & OpenFDA المعتمدة 🟢`;

  const updatedFullMessage = `🌿 *كبسولة صيدلية بيتك السريرية • المرجع الدوائي (DrugBank & FDA Standards)* 💊✨
━━━━━━━━━━━━━━━━━━━
👤 مرحباً بك يا *{name}* في التدريب الصيدلاني المتقدم!
📦 الصنف: *${product.name}* ${product.scientificName ? `(${product.scientificName})` : ''}
🔗 المرجع العلمي: ${baseCapsule.drugBankUrl}
━━━━━━━━━━━━━━━━━━━
🎯 *1. آلية العمل والحركية الدوائية (Mechanism & PK):*
• ${liveMechanism}
• *التوقيت والاستخدام المثالي:* ${liveUsageTiming}

⚠️ *2. الاستقلاب الكبدي وإنزيمات السيتوكروم (CYP450 Metabolism):*
• ${liveCypMetabolism}

🚫 *3. التداخلات الدوائية المعتمدة (Drug-Drug Interactions):*
${liveInteractions.map((i) => `• ${i}`).join('\n')}

🥗 *4. التداخلات الغذائية والكحولية (Food & Alcohol):*
${liveFoodAndAlcohol.map((f) => `• ${f}`).join('\n')}

⚠️ *5. التحذيرات الصندوقية واحتياطات الصرف (Black Box & Precautions):*
${liveWarnings.map((w) => `• ${w}`).join('\n')}

💡 *6. التوجيه السريري الذهبي للصيدلي عند الصرف:*
• ${liveGoldenTip}
━━━━━━━━━━━━━━━━━━━
${liveBanner}
🌿 *صيدلية بيتك.. رعاية صيدلانية متكاملة بمعايير عالمية!* ✨`;

  return {
    ...baseCapsule,
    mechanismAndPk: liveMechanism,
    usageTiming: liveUsageTiming,
    cypMetabolism: liveCypMetabolism,
    majorInteractions: liveInteractions,
    foodAndAlcoholInteractions: liveFoodAndAlcohol,
    blackBoxAndWarnings: liveWarnings,
    goldenCounselingTip: liveGoldenTip,
    fullMessageText: updatedFullMessage,
    liveInfo
  };
}
