import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { resolvePhysicalPassNumber } from './digitalPassInventory.ts';

const row = (itemCode: string, from: number, to: number, organizationId = 'org-a') => ({
  itemId: itemCode, itemCode, itemLabel: { de: itemCode, it: itemCode },
  organizationId, organizationLabel: organizationId, quantity: to - from + 1, from, to,
});

test('resolves only an eligible product range', () => {
  const data = { rows: [row('DNS_SEASON', 100, 200), row('AREA_WEEK', 201, 300)] };
  const result = resolvePhysicalPassNumber('000123', data, ['DNS_SEASON']);
  assert.equal(result.status, 'FOUND');
  if (result.status === 'FOUND') assert.equal(result.assignment.organizationId, 'org-a');
  assert.equal(resolvePhysicalPassNumber('220', data, ['DNS_SEASON']).status, 'NOT_FOUND');
});

test('rejects untrusted numbers and ambiguous assignments', () => {
  const data = { rows: [row('DNS_SEASON', 100, 200), row('DNS_SEASON', 150, 250, 'org-b')] };
  assert.equal(resolvePhysicalPassNumber('foo', data, ['DNS_SEASON']).status, 'INVALID_NUMBER');
  assert.equal(resolvePhysicalPassNumber('0', data, ['DNS_SEASON']).status, 'INVALID_NUMBER');
  assert.equal(resolvePhysicalPassNumber('170', data, ['DNS_SEASON']).status, 'AMBIGUOUS');
});
import { exportDigitalPassInventory } from './digitalPassInventory.ts';
test('exports actual sk-dns rows without granting approval or sale status', () => {
  const snapshot = exportDigitalPassInventory({ rows: [row('sk-dns',100,200)] }, '2026-27','revision-1');
  assert.equal(snapshot.approved,false);
  assert.equal(snapshot.rows[0].itemCode,'sk-dns');
  assert.equal('sold' in snapshot,false);
  assert.throws(()=>exportDigitalPassInventory({rows:[]},'2025-26','revision-1'));
  assert.throws(()=>exportDigitalPassInventory({rows:[row('sk-dns',100,200),row('sk-area',150,250)]},'2026-27','revision-1'));
});
