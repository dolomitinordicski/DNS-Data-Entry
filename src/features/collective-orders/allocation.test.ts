import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkAllocations } from './allocation.ts';
import type { CollectiveOrderLine } from './model.ts';
const line: CollectiveOrderLine = {
  id:'one', catalogItemId:'teamjacket-standard',description:'Jacke',quantity:2,unit:'piece',
  participant:{organizationId:'tv-a',billedOrganizationId:'tv-a',recipientOrganizationId:'tv-a'},
};
const scope={organizationIds:['tv-a','tv-b','dns']};
describe('collective procurement allocations',()=>{
  it('totals quantities per ordering and billed organization',()=>{
    const r=checkAllocations([line],scope);
    assert.equal(r.ok,true);
    assert.equal(r.totalQuantity,2);
    assert.equal(r.byOrderingOrganization['tv-a'],2);
    assert.equal(r.byBilledOrganization['tv-a'],2);
  });
  it('rejects unapproved payer substitution even within same area',()=>{
    const r=checkAllocations([{...line,participant:{...line.participant,billedOrganizationId:'dns'}}],scope);
    assert.ok(r.errors.includes('payer-assignment-not-approved:one'));
  });
  it('accepts explicit payer assignment',()=>{
    const r=checkAllocations([{...line,participant:{...line.participant,billedOrganizationId:'dns'}}],
      {...scope,payerAssignments:{'tv-a':['dns']}});
    assert.equal(r.ok,true);
    assert.equal(r.byBilledOrganization.dns,2);
  });
  it('rejects unknown recipient organizations',()=>{
    const r=checkAllocations([{...line,participant:{...line.participant,recipientOrganizationId:'unknown'}}],scope);
    assert.ok(r.errors.includes('unknown-recipient-organization:one'));
  });
  it('rejects duplicate line IDs and noninteger quantities',()=>{
    const r=checkAllocations([line,{...line,quantity:0.5}],scope);
    assert.ok(r.errors.includes('duplicate-line:one'));
    assert.ok(r.errors.includes('invalid-quantity:one'));
  });
});
