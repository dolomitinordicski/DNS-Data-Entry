import type { DNSAccessContext } from '../../types/access';
import type { CanonicalRecord } from '../../types/master';

type OrderPermission = 'ticketOrders.read' | 'ticketOrders.write';
type OrganizationAllows = (access: DNSAccessContext, organizationId: string, write?: boolean) => boolean;

/**
 * Align Bestellungen with the established Sales/KP organization selection:
 * membership + Data Entry organization policy + an effective order grant.
 * An area grant alone must NEVER expand a user into sibling organizations.
 * Firestore rules remain the final authority for every order.
 */
export function orderOrganizationIds(
  developmentMode: boolean,
  devAreaTest: boolean,
  access: DNSAccessContext | null,
  organizations: CanonicalRecord[],
  permission: OrderPermission,
  organizationAllows: OrganizationAllows,
): Set<string> {
  if ((developmentMode && !devAreaTest) || access?.isAdmin) {
    return new Set(organizations.map(organization => organization.id));
  }
  if (!access?.profile?.active) return new Set<string>();

  const write = permission === 'ticketOrders.write';
  return new Set(organizations.filter(organization => {
    if (!organizationAllows(access, organization.id, write)) return false;
    const areas = Array.isArray(organization.reportingAreaIds)
      ? organization.reportingAreaIds.filter((id): id is string => typeof id === 'string')
      : [];
    return access.grants.some(grant =>
      grant.active
      && grant.permissions.includes(permission)
      && (
        (grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski')
        || (grant.scopeType === 'organization' && grant.scopeId === organization.id)
        || (grant.scopeType === 'reportingArea' && areas.includes(grant.scopeId))
      )
    );
  }).map(organization => organization.id));
}
