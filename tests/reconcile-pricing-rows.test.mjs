import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialPricingDraft } from '../src/config/pricing.ts';
import { reconcilePricingRows } from '../src/config/reconcilePricingRows.ts';

const season = '2026-27';
const area = 'gsiesertal-welsberg-taisten';
const defaults = createInitialPricingDraft(season, [area]);
const areaRegular = defaults.find(x => x.scopeType === 'reportingArea' && x.scopeId === area
  && x.productCode === 'sk-area' && x.salesChannel === 'official' && x.salesPeriod === 'regular');
assert.ok(areaRegular);

test('retired organization override never masks the Val Casies regular area season tariff', () => {
  const retired = { ...areaRegular, scopeType: 'organization', active: false, revision: 2, unitPrice: 140 };
  const rows = reconcilePricingRows(defaults, [retired]);
  const areaRow = rows.find(x => x.scopeType === 'reportingArea' && x.scopeId === area
    && x.productCode === 'sk-area' && x.salesChannel === 'official' && x.salesPeriod === 'regular');
  assert.ok(areaRow);
  assert.equal(areaRow.unitPrice, null);
  assert.notEqual(areaRow.id, retired.id, 'new area price must not overwrite retired organization document');
  assert.equal(rows.filter(x => x.id === retired.id).length, 1);
  assert.equal(rows.filter(x => x.active === false).length, 1);
});

test('already saved area season tariff is preserved without creating a duplicate', () => {
  const savedArea = { ...areaRegular, unitPrice: 130, revision: 3, active: true };
  const rows = reconcilePricingRows(defaults, [savedArea]);
  assert.equal(rows.filter(x => x.scopeType === 'reportingArea' && x.productCode === 'sk-area'
    && x.salesChannel === 'official' && x.salesPeriod === 'regular').length, 1);
  assert.equal(rows.find(x => x.id === savedArea.id).unitPrice, 130);
});

test('a newly saved disambiguated area price stays stable on reload', () => {
  const retired = { ...areaRegular, scopeType: 'organization', active: false, revision: 2, unitPrice: 140 };
  const first = reconcilePricingRows(defaults, [retired]);
  const areaRow = first.find(x => x.scopeType === 'reportingArea' && x.productCode === 'sk-area'
    && x.salesChannel === 'official' && x.salesPeriod === 'regular');
  const savedArea = { ...areaRow, unitPrice: 130, revision: 1, active: true };
  const next = reconcilePricingRows(defaults, [retired, savedArea]);
  const matching = next.filter(x => x.scopeType === 'reportingArea' && x.productCode === 'sk-area'
    && x.salesChannel === 'official' && x.salesPeriod === 'regular');
  assert.equal(matching.length, 1);
  assert.equal(matching[0].id, savedArea.id);
  assert.equal(matching[0].unitPrice, 130);
});

test('area ordinary and presale prices remain separate', () => {
  const rows = reconcilePricingRows(defaults, []);
  assert.ok(rows.some(x => x.scopeType === 'reportingArea' && x.productCode === 'sk-area'
    && x.salesChannel === 'official' && x.salesPeriod === 'regular'));
  assert.ok(rows.some(x => x.scopeType === 'reportingArea' && x.productCode === 'sk-area'
    && x.salesChannel === 'official' && x.salesPeriod === 'presale'));
});
