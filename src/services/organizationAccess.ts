import type {DNSAccessContext} from '../types/access';
export function organizationAllows(access: DNSAccessContext, organizationId: string, write = false) {
  if (access.isAdmin) return true;
  if (!access.profile?.active || !access.memberships.some(m => m.active && m.organizationId === organizationId)) return false;
  const level = access.organizationLevels?.[organizationId] ?? 'none';
  return level === 'write' || (!write && level === 'read');
}
