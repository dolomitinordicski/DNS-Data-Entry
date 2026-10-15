/** Collective procurement is separate from seasonal ticket-order matrices.
 * No Firestore writes or Faktura billing calculations belong in this module.
 */
export type CollectiveOrderStatus = 'draft' | 'reviewed' | 'confirmed' | 'closed';
export type CollectiveOrderUnit = 'piece' | 'flat';
export type CollectiveOrderParticipant = {
  organizationId: string;
  reportingAreaId?: string;
  /** Ordered goods can be paid for by a different organization. */
  billedOrganizationId: string;
  recipientOrganizationId: string;
};
export type CollectiveOrderLine = {
  id: string;
  participant: CollectiveOrderParticipant;
  catalogItemId: string;
  description: string;
  variant?: string;
  quantity: number;
  unit: CollectiveOrderUnit;
};
export type CollectiveSupplierCost = {
  id: string;
  description: string;
  /** Amount in euro cents, net of VAT, from the supplier document. */
  netAmountCents: number;
  sourceDocumentId: string;
};
export type CollectiveOrder = {
  id: string;
  seasonId: string;
  title: string;
  supplierId: string;
  status: CollectiveOrderStatus;
  /** Provider confirmations; not fiscal invoices. */
  supplierDocumentIds: string[];
  lines: CollectiveOrderLine[];
  supplierCosts: CollectiveSupplierCost[];
  sourceRevision: number;
};
export type CollectiveOrderCheck = {
  ok: boolean;
  errors: string[];
  unitsByCatalogItem: Record<string, number>;
  supplierTotalCents: number;
};
/** Checks source completeness only. Rate and subsidy policy stays in Faktura V2. */
export function checkCollectiveOrder(order: CollectiveOrder): CollectiveOrderCheck {
  const errors: string[] = [];
  const quantities: Record<string, number> = {};
  if (!order.id || !order.seasonId || !order.title || !order.supplierId) errors.push('missing-order-identity');
  if (!Number.isSafeInteger(order.sourceRevision) || order.sourceRevision < 1) errors.push('invalid-source-revision');
  if (!order.supplierDocumentIds.length) errors.push('missing-supplier-documents');
  const lineIds = new Set<string>();
  for (const line of order.lines) {
    if (lineIds.has(line.id)) errors.push('duplicate-line-id:' + line.id);
    lineIds.add(line.id);
    if (!line.id || !line.catalogItemId || !line.participant.organizationId ||
        !line.participant.billedOrganizationId || !line.participant.recipientOrganizationId) {
      errors.push('incomplete-line:' + line.id);
    }
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) {
      errors.push('invalid-quantity:' + line.id);
    } else {
      quantities[line.catalogItemId] = (quantities[line.catalogItemId] ?? 0) + line.quantity;
    }
  }
  const costIds = new Set<string>();
  let total = 0;
  for (const cost of order.supplierCosts) {
    if (costIds.has(cost.id)) errors.push('duplicate-supplier-cost:' + cost.id);
    costIds.add(cost.id);
    if (!Number.isSafeInteger(cost.netAmountCents) || cost.netAmountCents < 0 ||
        !order.supplierDocumentIds.includes(cost.sourceDocumentId)) errors.push('invalid-supplier-cost:' + cost.id);
    else total += cost.netAmountCents;
  }
  if (!Number.isSafeInteger(total)) errors.push('supplier-total-overflow');
  return {ok: errors.length === 0, errors, unitsByCatalogItem: quantities, supplierTotalCents: total};
}
