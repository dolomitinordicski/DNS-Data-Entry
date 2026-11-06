import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { orderOrganizationIds } from './orderOrganizationScope.ts';
import { organizationAllows } from '../../services/organizationAccess.ts';
import type { DNSAccessContext } from '../../types/access.ts';
import type { CanonicalRecord } from '../../types/master.ts';

const organizations = [
  { id: 'tv-toblach', reportingAreaIds: ['drei-zinnen'] },
  { id: 'tv-innichen', reportingAreaIds: ['drei-zinnen'] },
  { id: 'tv-sexten', reportingAreaIds: ['drei-zinnen'] },
  { id: 'tv-comelico', reportingAreaIds: ['val-comelico'] },
] as CanonicalRecord[];

function context({
  memberIds = ['tv-toblach'],
  area = 'drei-zinnen',
  permission = ['ticketOrders.read', 'ticketOrders.write'],
  level = 'write',
  admin = false,
  active = true,
}: {
  memberIds?: string[];
  area?: string;
  permission?: string[];
  level?: 'none' | 'read' | 'write';
  admin?: boolean;
  active?: boolean;
} = {}): DNSAccessContext {
  return {
    profile: { id: 'test', active, globalRoles: admin ? ['dns-admin'] : [] },
    isAdmin: admin,
    memberships: memberIds.map(organizationId => ({
      id: 'test__' + organizationId, userId: 'test', organizationId, role: 'contributor', active: true,
    })),
    organizationLevels: Object.fromEntries(memberIds.map(id => [id, level])),
    grants: [
      { id: 'test__reportingArea__' + area, userId: 'test', active: true,
        scopeType: 'reportingArea', scopeId: area, permissions: permission },
    ],
    permissions: new Set(permission),
  } as DNSAccessContext;
}

const ids = (access: DNSAccessContext, permission: 'ticketOrders.read'|'ticketOrders.write' = 'ticketOrders.read') =>
  [...orderOrganizationIds(false, false, access, organizations, permission, organizationAllows)].sort();

describe('Bestellungen membership scope matches Sales and KP', () => {
  it('Toblach sees only own tourist association, not Innichen/Sexten in the same Drei Zinnen area', () => {
    assert.deepEqual(ids(context()), ['tv-toblach']);
    assert.deepEqual(ids(context(), 'ticketOrders.write'), ['tv-toblach']);
  });
  it('supports several explicitly assigned associations within the same area', () => {
    assert.deepEqual(ids(context({memberIds:['tv-toblach','tv-innichen']})), ['tv-innichen','tv-toblach']);
  });
  it('Comelico sees only its own association', () => {
    assert.deepEqual(ids(context({memberIds:['tv-comelico'],area:'val-comelico'})), ['tv-comelico']);
  });
  it('read-only organization policy permits reading but not writing', () => {
    const access = context({level:'read'});
    assert.deepEqual(ids(access), ['tv-toblach']);
    assert.deepEqual(ids(access,'ticketOrders.write'), []);
  });
  it('no permission or disabled organization policy denies the area row', () => {
    assert.deepEqual(ids(context({permission:[]})), []);
    assert.deepEqual(ids(context({level:'none'})), []);
    assert.deepEqual(ids(context({active:false})), []);
  });
  it('network grant cannot bypass a missing membership', () => {
    const access = context();
    access.grants = [{...access.grants[0], scopeType:'network', scopeId:'dolomiti-nordicski'}];
    assert.deepEqual(ids(access), ['tv-toblach']);
  });
  it('DNS Admin remains able to read and write all organizations', () => {
    const access = context({admin:true,memberIds:[]});
    assert.deepEqual(ids(access), organizations.map(o=>o.id).sort());
    assert.deepEqual(ids(access,'ticketOrders.write'), organizations.map(o=>o.id).sort());
  });
  it('explicit organization grant only permits the matching active membership', () => {
    const access = context({memberIds:['tv-toblach','tv-innichen']});
    access.grants = [{...access.grants[0],scopeType:'organization',scopeId:'tv-innichen'}];
    assert.deepEqual(ids(access), ['tv-innichen']);
  });
});
