import type { PricingDraftRow } from '../types/pricing';

/** A persisted organization override can have the same legacy document ID as
 * an area tariff. Identity must include scope, not merely the Firestore ID. */
export function pricingRowKey(row: PricingDraftRow): string {
  return JSON.stringify([
    row.seasonId, row.scopeType, row.scopeId,
    row.productCode, row.salesChannel, row.salesPeriod,
  ]);
}

/**
 * Keep persisted pricing records intact, and ensure every canonical default
 * tariff remains visible even if a different-scope override was retired.
 *
 * In a cross-scope ID collision, a fresh area row receives a disambiguated
 * Firestore ID so it can actually be saved without overwriting the old override.
 * Existing persisted area prices keep their original ID and revisions.
 */
export function reconcilePricingRows(
  defaults: PricingDraftRow[],
  saved: PricingDraftRow[],
): PricingDraftRow[] {
  const savedKeys = new Set(saved.map(pricingRowKey));
  const occupiedIds = new Set(saved.map(row => row.id));
  const missing: PricingDraftRow[] = [];

  for (const draft of defaults) {
    if (savedKeys.has(pricingRowKey(draft))) continue;
    let id = draft.id;
    if (occupiedIds.has(id)) {
      id = [
        draft.seasonId, draft.scopeType, draft.scopeId,
        draft.productCode, draft.salesChannel, draft.salesPeriod,
      ].join('__');
      if (occupiedIds.has(id)) {
        throw new Error('PRICING_ID_COLLISION');
      }
    }
    missing.push({ ...draft, id });
    occupiedIds.add(id);
  }

  return [...missing, ...saved];
}
