import { describe, expect, it } from 'vitest';
import { checkCollectiveOrder, type CollectiveOrder } from './model';

function fixture(): CollectiveOrder {
  return {
    id: 'dns-teamjacke-2026',
    seasonId: '2026-27',
    title: 'DNS Teamjacke',
    supplierId: 'texmarket',
    status: 'draft',
    supplierDocumentIds: ['OV26-0708', 'OV26-0712'],
    sourceRevision: 1,
    lines: [
      {
        id: 'line-standard', catalogItemId: 'jacket-standard', description: 'Standard',
        quantity: 33, unit: 'piece',
        participant: {organizationId: 'partner-a', billedOrganizationId: 'partner-a', recipientOrganizationId: 'partner-a'},
      },
      {
        id: 'line-control', catalogItemId: 'jacket-control', description: 'Ticket Control',
        quantity: 27, unit: 'piece',
        participant: {organizationId: 'partner-b', billedOrganizationId: 'partner-b', recipientOrganizationId: 'partner-b'},
      },
    ],
    supplierCosts: [
      {id: 'supplier-standard', description: 'OV26-0708', netAmountCents: 557800, sourceDocumentId: 'OV26-0708'},
      {id: 'supplier-control', description: 'OV26-0712', netAmountCents: 433200, sourceDocumentId: 'OV26-0712'},
    ],
  };
}

describe('collective order source validation', () => {
  it('accepts the source control totals without performing billing', () => {
    const result = checkCollectiveOrder(fixture());
    expect(result).toEqual({
      ok: true, errors: [],
      unitsByCatalogItem: {'jacket-standard': 33, 'jacket-control': 27},
      supplierTotalCents: 991000,
    });
  });
  it('rejects negative and fractional quantities', () => {
    for (const quantity of [-1, 1.5, Number.NaN]) {
      const order = fixture();
      order.lines[0].quantity = quantity;
      expect(checkCollectiveOrder(order).errors).toContain('invalid-quantity:line-standard');
    }
  });
  it('rejects duplicated line IDs and supplier cost IDs', () => {
    const order = fixture();
    order.lines[1].id = order.lines[0].id;
    order.supplierCosts[1].id = order.supplierCosts[0].id;
    expect(checkCollectiveOrder(order).errors).toContain('duplicate-line-id:line-standard');
    expect(checkCollectiveOrder(order).errors).toContain('duplicate-supplier-cost:supplier-standard');
  });
  it('rejects supplier amounts without a matching document', () => {
    const order = fixture();
    order.supplierCosts[0].sourceDocumentId = 'unknown';
    expect(checkCollectiveOrder(order).errors).toContain('invalid-supplier-cost:supplier-standard');
  });
  it('requires separate purchasing, billing, and recipient identities', () => {
    const order = fixture();
    order.lines[0].participant.billedOrganizationId = '';
    expect(checkCollectiveOrder(order).errors).toContain('incomplete-line:line-standard');
  });
  it('rejects invalid revision and missing supplier documents', () => {
    const order = fixture();
    order.sourceRevision = 0;
    order.supplierDocumentIds = [];
    const errors = checkCollectiveOrder(order).errors;
    expect(errors).toContain('invalid-source-revision');
    expect(errors).toContain('missing-supplier-documents');
  });
});
