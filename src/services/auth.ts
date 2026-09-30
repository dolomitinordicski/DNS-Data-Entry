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
  const iso = now.toISOString().slice(0, 10);
  if (item.validFrom && item.validFrom > iso) return false;
  if (item.validTo && item.validTo < iso) return false;
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

  const permissions = new Set<DNSPermission>(
    isAdmin
      ? ADMIN_PERMISSIONS
      : profile?.active
        ? grants.flatMap((grant) => grant.permissions)
        : [],
  );

  return {
    profile,
    memberships,
    grants,
    permissions,
    isAdmin,
  };
}
