import type { DNSAccessContext, DNSPermission } from '../types/access';
import type { OrderMatrixOrganization } from '../types/orderMatrix';

export type DevPersona = 'admin' | 'area-test';

const adminPermissions: DNSPermission[] = [
  'season.read',
  'season.manage',
  'pricing.read',
  'pricing.manage',
  'ticketOrders.read',
  'ticketOrders.write',
  'ticketOrders.verify',
  'ticketSales.read',
  'ticketSales.write',
  'ticketSales.verify',
  'kp.read',
  'kp.write',
  'kp.verify',
  'verification.read',
  'verification.manage',
];

const areaPermissions: DNSPermission[] = [
  'season.read',
  'pricing.read',
  'ticketOrders.read',
  'ticketOrders.write',
  'ticketSales.read',
  'ticketSales.write',
  'kp.read',
  'kp.write',
];

export const DEV_ADMIN_ACCESS: DNSAccessContext = {
  profile: {
    id: 'dev-admin',
    active: true,
    preferredLanguage: 'de',
    globalRoles: ['dns-admin'],
  },
  memberships: [],
  grants: [],
  permissions: new Set(adminPermissions),
  isAdmin: true,
};

export const DEV_AREA_TEST_ACCESS: DNSAccessContext = {
  profile: {
    id: 'dev-area-test',
    active: true,
    preferredLanguage: 'de',
    globalRoles: [],
  },
  memberships: [],
  grants: [
    {
      id: 'dev-area-test__reportingArea__drei-zinnen',
      userId: 'dev-area-test',
      scopeType: 'reportingArea',
      scopeId: 'drei-zinnen',
      permissions: areaPermissions,
      active: true,
    },
  ],
  permissions: new Set(areaPermissions),
  isAdmin: false,
};

export function devAccessFor(persona: DevPersona): DNSAccessContext {
  return persona === 'area-test' ? DEV_AREA_TEST_ACCESS : DEV_ADMIN_ACCESS;
}

export const DEV_AREA_TEST_LABEL = 'AREA TEST · 3 Zinnen';

export const DEV_AREA_TEST_DELIVERY_LOCATIONS: Record<
  string,
  NonNullable<OrderMatrixOrganization['deliveryLocation']>
> = {
  'tv-toblach': {
    id: 'dev-delivery-tv-toblach',
    label: 'DEV · Toblach',
    recipientName: 'AREA TEST · TV Toblach',
    addressLine1: 'Teststraße 1',
    postalLocality: '39034 Toblach',
    phone: '000 000001',
    status: 'verified',
  },
  'tv-niederdorf': {
    id: 'dev-delivery-tv-niederdorf',
    label: 'DEV · Niederdorf',
    recipientName: 'AREA TEST · TV Niederdorf',
    addressLine1: 'Teststraße 2',
    postalLocality: '39039 Niederdorf',
    phone: '000 000002',
    status: 'verified',
  },
  'tv-innichen': {
    id: 'dev-delivery-tv-innichen',
    label: 'DEV · Innichen',
    recipientName: 'AREA TEST · TV Innichen',
    addressLine1: 'Lieferadresse vor Versand bestätigen',
    postalLocality: '39038 Innichen',
    phone: '000 000003',
    status: 'needs-confirmation',
    notes: 'DEV fixture for address-warning workflow.',
  },
  'tv-sexten': {
    id: 'dev-delivery-tv-sexten',
    label: 'DEV · Sexten',
    recipientName: 'AREA TEST · TV Sexten',
    addressLine1: 'Teststraße 4',
    postalLocality: '39030 Sexten',
    phone: '000 000004',
    status: 'verified',
  },
  'tv-prags': {
    id: 'dev-delivery-tv-prags',
    label: 'DEV · Prags',
    recipientName: 'AREA TEST · TV Prags',
    addressLine1: 'Teststraße 5',
    postalLocality: '39030 Prags',
    phone: '000 000005',
    status: 'verified',
  },
};
