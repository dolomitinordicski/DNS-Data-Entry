export type DNSPermission =
  | 'season.read'
  | 'season.manage'
  | 'pricing.read'
  | 'pricing.manage'
  | 'ticketOrders.read'
  | 'ticketOrders.write'
  | 'ticketOrders.verify'
  | 'ticketSales.read'
  | 'ticketSales.write'
  | 'ticketSales.verify'
  | 'kp.read'
  | 'kp.write'
  | 'kp.verify'
  | 'verification.read'
  | 'verification.manage';

export type DNSMembershipRole = 'viewer' | 'contributor' | 'reviewer';
export type DNSGlobalRole = 'dns-admin';

export interface DNSUserProfile {
  id: string;
  active: boolean;
  preferredLanguage?: 'de' | 'it' | 'en';
  globalRoles: DNSGlobalRole[];
}

export interface DNSMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: DNSMembershipRole;
  active: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface DNSAccessGrant {
  id: string;
  userId: string;
  scopeType: 'network' | 'reportingArea' | 'destination' | 'organization';
  scopeId: string;
  permissions: DNSPermission[];
  active: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface DNSAccessContext {
  profile: DNSUserProfile | null;
  memberships: DNSMembership[];
  grants: DNSAccessGrant[];
  permissions: Set<DNSPermission>;
  isAdmin: boolean;
}
