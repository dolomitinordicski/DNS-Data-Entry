import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth } from './auth';
import { db } from './dnsCore';
import type { DNSAccessContext } from '../types/access';

export type KpMilestoneDoc = {
  id: string;
  seasonId: string;
  date: string;
  label: string;
  order: number;
};

export type KpMilestoneValue = {
  milestoneId: string;
  openedKm: number;
  naturalSnowKm: number;
  artificialSnowKm: number;
};

export type KpEntryDoc = {
  id: string;
  seasonId: string;
  entityType: 'organization';
  entityId: string;
  reportingAreaId: string;
  referenceKm: {
    uniqueNetworkKm: number;
    potentialOperationalKm: number;
  };
  milestones: KpMilestoneValue[];
  includeInKp: boolean;
  exclusionReason: string;
  notes: string;
  revision?: number;
};

export type KpFairValidationDoc = {
  id: string;
  seasonId: string;
  reportingAreaId: string;
  milestoneId: string;
  potentialOperationalKm: number;
  openedKm: number;
  naturalSnowKm: number;
  artificialSnowKm: number;
  revision?: number;
  validatedBy?: string;
  validatedAt?: unknown;
};

const provenance = {
  sourceSystem: 'manual-data-entry',
  methodVersion: 1,
  dataStatus: 'draft',
} as const;

function uid() {
  const value = auth.currentUser?.uid;
  if (!value) throw new Error('Authentication required');
  return value;
}

function readableQueries(collectionName: string, seasonId: string, access: DNSAccessContext) {
  const grants = access.grants.filter((grant) => grant.active && grant.permissions.includes('kp.read'));
  const unrestricted =
    access.isAdmin ||
    grants.some((grant) => grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski');

  if (unrestricted) {
    return [query(collection(db, collectionName), where('seasonId', '==', seasonId))];
  }

  return grants
    .filter((grant) => grant.scopeType === 'reportingArea')
    .map((grant) => query(
      collection(db, collectionName),
      where('seasonId', '==', seasonId),
      where('reportingAreaId', '==', grant.scopeId),
    ));
}

export async function loadKpMilestones(seasonId: string): Promise<KpMilestoneDoc[]> {
  const snapshot = await getDocs(query(collection(db, 'kpMilestones'), where('seasonId', '==', seasonId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as KpMilestoneDoc))
    .sort((a, b) => a.order - b.order);
}

export async function loadKpEntries(seasonId: string, access: DNSAccessContext): Promise<KpEntryDoc[]> {
  const grants = access.grants.filter((grant) => grant.active && grant.permissions.includes('kp.read'));
  const unrestricted =
    access.isAdmin ||
    grants.some((grant) => grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski');

  const queries = unrestricted
    ? [query(collection(db, 'kpEntries'), where('seasonId', '==', seasonId))]
    : grants
      .filter((grant) => grant.scopeType === 'organization' || grant.scopeType === 'reportingArea')
      .map((grant) => query(
        collection(db, 'kpEntries'),
        where('seasonId', '==', seasonId),
        where(grant.scopeType === 'organization' ? 'entityId' : 'reportingAreaId', '==', grant.scopeId),
      ));

  const snapshots = await Promise.all(queries.map((item) => getDocs(item)));
  const deduped = new Map<string, KpEntryDoc>();
  snapshots.flatMap((snapshot) => snapshot.docs).forEach((item) => {
    const data = { id: item.id, ...item.data() } as KpEntryDoc;
    data.milestones = (data.milestones ?? []).map((value) => ({
      ...value,
      openedKm: typeof value.openedKm === 'number'
        ? value.openedKm
        : (Number(value.naturalSnowKm ?? 0) + Number(value.artificialSnowKm ?? 0)),
    }));
    deduped.set(item.id, data);
  });
  return [...deduped.values()];
}

export async function loadKpFairValidations(
  seasonId: string,
  access: DNSAccessContext,
): Promise<KpFairValidationDoc[]> {
  const snapshots = await Promise.all(
    readableQueries('kpFairValidations', seasonId, access).map((item) => getDocs(item)),
  );
  const deduped = new Map<string, KpFairValidationDoc>();
  snapshots.flatMap((snapshot) => snapshot.docs).forEach((item) => {
    deduped.set(item.id, { id: item.id, ...item.data() } as KpFairValidationDoc);
  });
  return [...deduped.values()];
}

export async function saveKpMilestone(value: KpMilestoneDoc) {
  const userId = uid();
  await setDoc(doc(db, 'kpMilestones', value.id), {
    ...value,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

export async function saveKpEntry(value: Omit<KpEntryDoc, 'revision'>) {
  const userId = uid();
  const ref = doc(db, 'kpEntries', value.id);
  const existing = await getDoc(ref);
  const next = {
    ...value,
    provenance,
    revision: existing.exists() ? Number(existing.data().revision ?? 1) + 1 : 1,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    await setDoc(ref, next);
    return next.revision;
  }

  const previous = existing.data();
  const batch = writeBatch(db);
  batch.set(doc(db, 'kpEntries', value.id, 'revisions', String(previous.revision ?? 1)), previous);
  batch.set(ref, next);
  await batch.commit();
  return next.revision;
}

export async function validateKpFairCandidate(
  value: Omit<KpFairValidationDoc, 'revision' | 'validatedBy' | 'validatedAt'>,
) {
  const userId = uid();
  const ref = doc(db, 'kpFairValidations', value.id);
  const existing = await getDoc(ref);
  const next = {
    ...value,
    revision: existing.exists() ? Number(existing.data().revision ?? 1) + 1 : 1,
    validatedBy: userId,
    validatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    await setDoc(ref, next);
    return next.revision;
  }

  const previous = existing.data();
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'kpFairValidations', value.id, 'revisions', String(previous.revision ?? 1)),
    previous,
  );
  batch.set(ref, next);
  await batch.commit();
  return next.revision;
}
