import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
/** Test only pure header rules; Firestore enforcement is separately tested in dns-shared-data. */
import { validHeaderInput, validHeaderTransition } from './headerValidation.ts';

describe('collective order admin header contract', () => {
  it('validates input and supplier document references', () => {
    const valid = {id:'teamjacke-2026',seasonId:'2026-27',title:'DNS Teamjacke',supplierId:'texmarket',
      status:'draft' as const,sourceRevision:1,supplierDocumentIds:['OV26-0708','OV26-0712']};
    assert.deepEqual(validHeaderInput(valid),[]);
    assert.ok(validHeaderInput({...valid,supplierDocumentIds:[]}).includes('missing-supplier-document'));
    assert.ok(validHeaderInput({...valid,id:'../unsafe'}).includes('invalid-id'));
    assert.ok(validHeaderInput({...valid,sourceRevision:0}).includes('invalid-revision'));
  });
  it('enforces approved monotone transitions', () => {
    assert.equal(validHeaderTransition('draft','reviewed'),true);
    assert.equal(validHeaderTransition('reviewed','confirmed'),true);
    assert.equal(validHeaderTransition('confirmed','closed'),true);
    assert.equal(validHeaderTransition('confirmed','draft'),false);
    assert.equal(validHeaderTransition('closed','closed'),false);
  });
});
