import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialPricingDraft } from '../src/config/pricing.ts';

const season = '2026-27';
const areas = ['gsiesertal-welsberg-taisten', 'osttirol', 'drei-zinnen'];

test('every area has its own regular and presale area season tickets', () => {
  const rows = createInitialPricingDraft(season, areas);
  for (const area of areas) {
    const regular = rows.find(row => row.productCode === 'sk-area' && row.scopeType === 'reportingArea' && row.scopeId === area && row.salesPeriod === 'regular' && row.salesChannel === 'official');
    const presale = rows.find(row => row.productCode === 'sk-area' && row.scopeType === 'reportingArea' && row.scopeId === area && row.salesPeriod === 'presale' && row.salesChannel === 'official');
    assert.ok(regular, `missing regular area season price: ${area}`);
    assert.ok(presale, `missing presale area season price: ${area}`);
    assert.equal(regular.unitPrice, null);
    assert.equal(presale.unitPrice, null);
    assert.equal(regular.id, `${season}-${area}-sk-area-official-regular`);
    assert.equal(presale.id, `${season}-${area}-sk-area-official-presale`);
  }
});

test('no new network-scoped area season price is generated', () => {
  const rows = createInitialPricingDraft(season, areas);
  assert.equal(rows.filter(row => row.scopeType === 'network' && row.productCode === 'sk-area').length, 0);
  assert.equal(rows.filter(row => row.scopeType === 'network' && row.productCode === 'sk-dns' && row.salesPeriod === 'presale').length, 1);
  assert.equal(rows.filter(row => row.scopeType === 'network' && row.productCode === 'sk-dns' && row.salesPeriod === 'regular').length, 1);
});

test('DNS weekly prices remain network-only and area tickets remain area-owned', () => {
  const rows = createInitialPricingDraft(season, areas);
  for (const code of ['wk-dns', 'sk-dns']) {
    assert.ok(rows.some(row => row.scopeType === 'network' && row.productCode === code));
    assert.equal(rows.filter(row => row.scopeType === 'reportingArea' && row.productCode === code).length, 0);
  }
  for (const code of ['day', 'wk-area', 'sk-area']) {
    assert.ok(rows.some(row => row.scopeType === 'reportingArea' && row.productCode === code));
  }
});

test('IDs across all generated price rows are distinct', () => {
  const rows = createInitialPricingDraft(season, areas);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
});
