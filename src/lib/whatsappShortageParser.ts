/**
 * WhatsApp Group Shortage & Drug Order Intelligent Parser
 * Extracts medicines, quantities, units, and urgency from WhatsApp messages,
 * matching them against PostgreSQL Inventory and BNF 83 Clinical Knowledge.
 */

import { prisma } from './prisma';
import { queryBnfMonograph } from './bnfKnowledge';
import { extractActiveChemicalMolecule } from './clinicalKnowledge';
import { resolveRegionalBrand } from './liveDrugFetcher';

export interface ParsedShortageItem {
  rawLine: string;
  productName: string;
  matchedCode?: string | null;
  activeIngredient?: string | null;
  requestedQty?: number | null;
  unit: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
}

// Common Arabic conversational filler prefixes to strip
const FILLER_PATTERNS = [
  /^(السلام عليكم|مرحبا|صباح الخير|مساء الخير|يا شباب|دكتور|صيدلية)\b[^\n]*\n?/gi,
  /^(نواقص|طلبية|قائمة النواقص|طلبات اليوم|نواقص الفرع|أصناف ناقصة|محتاجين|ناقصنا|يرجى توفير|مطلوب|نبي|نريد|طلب شراء)\s*[:\-]?\s*/gi,
  /^[\d\.\-\*\•\–\—\(\)\#\>\+]+\s*/g, // list bullets e.g. "1.", "- ", "* "
];

// Unit matching regex
const UNIT_REGEX = /(علبة|علب|باكت|بكيت|كرتونة|كرتون|شريط|أمبول|امبولات|فيال|قطعة|حبة|كبسولة|شامبو|مرهم|كريم|بخاخ|packs?|boxes?|strips?|vials?|amps?|bottles?|pcs)/i;

// Quantity matching regex: e.g. "20 علبة", "x 10", "10x", "- 5", "الكمية: 15"
const QTY_REGEX = /(?:الكمية\s*[:=]?\s*|\*|x\s*|×\s*|-|\:)?\s*(\d+(?:\.\d+)?)\s*(علبة|علب|باكت|بكيت|كرتونة|كرتون|شريط|أمبول|امبولات|فيال|قطعة|حبة|كبسولة|شامبو|مرهم|كريم|بخاخ|packs?|boxes?|strips?|vials?|amps?|bottles?|pcs)?/i;

export async function parseWhatsAppMessageToShortages(messageText: string): Promise<ParsedShortageItem[]> {
  if (!messageText || !messageText.trim()) return [];

  // 1. Split into individual lines
  const lines = messageText
    .split(/\r?\n|,|;/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const results: ParsedShortageItem[] = [];

  for (let line of lines) {
    // Strip greetings and header lines
    for (const pat of FILLER_PATTERNS) {
      line = line.replace(pat, '').trim();
    }

    if (!line || line.length < 2) continue;

    // Check urgency flags
    let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    if (/عاجل|ضروري|طوارئ|مهم جدا|حرج|urgent|emergency|stat|critical/i.test(line)) {
      urgency = 'CRITICAL';
    } else if (/متوسط|عادي|medium/i.test(line)) {
      urgency = 'MEDIUM';
    }

    // Extract quantity and unit - Nullable if not explicitly mentioned
    let requestedQty: number | null = null;
    let unit = 'عبوة';
    let cleanName = line;

    // Match quantity patterns
    const qtyMatch = line.match(/(?:(?:الكمية|عدد|مطلوب)\s*[:=]?\s*)?(\d+(?:\.\d+)?)\s*(علبة|علب|باكت|بكيت|كرتونة|كرتون|شريط|أمبول|امبولات|فيال|قطعة|حبة|كبسولة|شامبو|مرهم|كريم|بخاخ|packs?|boxes?|strips?|vials?|amps?|bottles?|pcs)?$/i)
      || line.match(/[-:=–x×]\s*(\d+(?:\.\d+)?)\s*(علبة|علب|باكت|بكيت|كرتونة|كرتون|شريط|أمبول|امبولات|فيال|قطعة|حبة|كبسولة|شامبو|مرهم|كريم|بخاخ|packs?|boxes?|strips?|vials?|amps?|bottles?|pcs)?/i)
      || line.match(/\b(\d+)\s*(علبة|علب|باكت|بكيت|كرتونة|كرتون|شريط|أمبول|امبولات|فيال|قطعة|حبة|كبسولة|packs?|boxes?)/i);

    if (qtyMatch) {
      requestedQty = parseFloat(qtyMatch[1]) || null;
      if (qtyMatch[2]) {
        unit = qtyMatch[2].trim();
      }
      // Remove quantity and unit part from the drug name
      cleanName = cleanName.replace(qtyMatch[0], '').trim();
    }

    // Clean remaining trailing dashes or symbols
    cleanName = cleanName.replace(/^[-–—:\.\s]+|[-–—:\.\s]+$/g, '').trim();

    if (!cleanName || cleanName.length < 2) continue;

    // 2. Match against PostgreSQL Inventory Database (PharmacyProduct)
    let matchedCode: string | null = null;
    let activeIngredient: string | null = null;

    try {
      // Direct exact or LIKE search in PostgreSQL
      const safeTerm = cleanName.replace(/'/g, "''");
      const matchedDbProduct = await prisma.pharmacyProduct.findFirst({
        where: {
          OR: [
            { productName: { contains: cleanName, mode: 'insensitive' } },
            { productCode: { equals: cleanName, mode: 'insensitive' } },
            { barcodes: { contains: cleanName } },
            { activeIngredient: { contains: cleanName, mode: 'insensitive' } }
          ]
        },
        select: {
          productCode: true,
          productName: true,
          activeIngredient: true,
          inventoryUnit: true,
          orderUnit: true
        }
      });

      if (matchedDbProduct) {
        matchedCode = matchedDbProduct.productCode;
        activeIngredient = matchedDbProduct.activeIngredient;
        if (!unit || unit === 'عبوة') {
          unit = matchedDbProduct.orderUnit || matchedDbProduct.inventoryUnit || 'عبوة';
        }
      }
    } catch (err) {
      console.warn('DB Matching warning:', err);
    }

    // 3. Match with Regional Clinical Brands & BNF 83
    if (!activeIngredient) {
      const regional = resolveRegionalBrand(cleanName);
      if (regional) {
        activeIngredient = regional.ingredient;
      } else {
        const bnf = queryBnfMonograph(cleanName);
        if (bnf) {
          activeIngredient = bnf.drugName;
        } else {
          const mol = extractActiveChemicalMolecule(cleanName);
          if (mol && mol.normalizedChemicalName) {
            activeIngredient = mol.normalizedChemicalName;
          }
        }
      }
    }

    results.push({
      rawLine: line,
      productName: cleanName,
      matchedCode,
      activeIngredient,
      requestedQty,
      unit,
      urgency,
      notes: `المصدر: رسالة واتساب • ${new Date().toLocaleDateString('ar-LY')}`
    });
  }

  return results;
}
