export interface GenericRiskAlert {
  genericGroupId: string;
  activeIngredient: string;
  hasNearExpirySubstitute: boolean;
  substituteProductName?: string;
  substituteStock?: number;
  substituteExpiryDate?: string;
  substituteDaysRemaining?: number;
  recommendationMessage?: string;
}

/**
 * Calculates true in-stock sales velocity (sales rate per active in-stock day)
 */
export function calculateInStockVelocity(totalSoldQty: number, estimatedDaysInStock: number = 30): number {
  const activeDays = Math.max(1, estimatedDaysInStock);
  const velocity = (totalSoldQty || 0) / activeDays;
  return Number(velocity.toFixed(2));
}

/**
 * Calculates Days of Inventory Remaining (DOI)
 */
export function calculateDaysOfInventory(stockOnHand: number, dailyVelocity: number): number {
  if (dailyVelocity <= 0) return stockOnHand > 0 ? 999 : 0;
  const doi = (stockOnHand || 0) / dailyVelocity;
  return Math.round(doi);
}
