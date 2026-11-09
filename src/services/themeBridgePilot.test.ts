import test from 'node:test';
import assert from 'node:assert/strict';
import { dataEntryThemeParentOrigin, isDNSDataEntryEmbedded, DNS_THEME_PARENT_ORIGIN } from './themeBridgePilot.ts';

test('theme receiver eligibility is limited to explicit embedded=1', () => {
  assert.equal(dataEntryThemeParentOrigin('?embedded=1'), DNS_THEME_PARENT_ORIGIN);
  assert.equal(dataEntryThemeParentOrigin('?foo=bar&embedded=1'), DNS_THEME_PARENT_ORIGIN);
  assert.equal(dataEntryThemeParentOrigin('?embedded=0'), undefined);
  assert.equal(dataEntryThemeParentOrigin('?share=public-order'), undefined);
  assert.equal(dataEntryThemeParentOrigin(''), undefined);
});
test('embedded hint is exact and independent of other query parameters', () => {
  assert.equal(isDNSDataEntryEmbedded('?embedded=true'), false);
  assert.equal(isDNSDataEntryEmbedded('?embedded=1&season=2026-27'), true);
});
