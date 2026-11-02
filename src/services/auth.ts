import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { app, db } from './dnsCore';
import type {
  DNSAccessContext,
  DNSAccessGrant,
  DNSMembership,
  DNSPermission,
  DNSUserProfile,
} from '../types/access';

export const auth = getAuth(app);

const ADMIN_PERMISSIONS: DNSPermission[] = [
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

function isCurrentlyActive(
  item: { active: boolean; validFrom?: string; validTo?: string },
  now = new Date(),
) {
  if (!item.active) return false;
  if (item.validFrom && (!Number.isFinite(Date.parse(item.validFrom)) || Date.parse(item.validFrom) > now.getTime())) return false;
  if (item.validTo && (!Number.isFinite(Date.parse(item.validTo)) || Date.parse(item.validTo) < now.getTime())) return false;
  return true;
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export async function loadAccessContext(uid: string): Promise<DNSAccessContext> {
  const [profileSnapshot, membershipsSnapshot, grantsSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDocs(query(collection(db, 'memberships'), where('userId', '==', uid))),
    getDocs(query(collection(db, 'accessGrants'), where('userId', '==', uid))),
  ]);

  const profile = profileSnapshot.exists()
    ? ({ id: profileSnapshot.id, ...profileSnapshot.data() } as DNSUserProfile)
    : null;

  const memberships = membershipsSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as DNSMembership)
    .filter((item) => isCurrentlyActive(item));

  const grants = grantsSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as DNSAccessGrant)
    .filter((item) => isCurrentlyActive(item));

  const isAdmin =
    profile?.active === true && profile.globalRoles?.includes('dns-admin') === true;

  const organizationLevels = Object.fromEntries(await Promise.all(memberships.map(async member => {
    const policy = await getDoc(doc(db, 'organizationToolAccess', member.organizationId));
    const level = policy.exists() ? policy.data().tools?.['data-entry'] ?? 'none' : 'write';
    return [member.organizationId, ['write','read'].includes(level) ? level : 'none'];
  }))) as Record<string, 'write'|'read'|'none'>;
  const levels = Object.values(organizationLevels);
  const usableGrants = isAdmin ? grants : grants.map(grant => ({...grant,
    permissions: grant.permissions.filter(permission => {
      const allowed = grant.scopeType === 'organization' ? [organizationLevels[grant.scopeId] ?? 'none'] : levels;
      return allowed.some(level => level === 'write' || (level === 'read' && permission.endsWith('.read')));
    }),
  })).filter(grant => grant.permissions.length > 0);

  const permissions = new Set<DNSPermission>(
    isAdmin
      ? ADMIN_PERMISSIONS
      : profile?.active
        ? usableGrants.flatMap((grant) => grant.permissions)
        : [],
  );

  return {
    profile,
    memberships,
    grants: usableGrants,
    organizationLevels,
    permissions,
    isAdmin,
  };
}
