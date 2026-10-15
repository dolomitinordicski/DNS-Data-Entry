import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/dnsCore';
import type { CollectiveOrderStatus } from './model';

/** Privileged header-only persistence. No allocation, supplier cost or Faktura writes. */
export type CollectiveOrderHeader = {
  id: string;
  seasonId: string;
  title: string;
  supplierId: string;
  status: CollectiveOrderStatus;
  sourceRevision: number;
  supplierDocumentIds: string[];
};

export function validHeaderInput(header: CollectiveOrderHeader): string[] {
  const errors: string[] = [];
  if (!header.id.trim() || !/^[a-z0-9][a-z0-9-]*$/.test(header.id)) errors.push('invalid-id');
  if (!header.seasonId.trim() || !header.title.trim() || !header.supplierId.trim()) errors.push('missing-required-field');
  if (!header.supplierDocumentIds.length || header.supplierDocumentIds.some(id => !id.trim())) errors.push('missing-supplier-document');
  if (!Number.isSafeInteger(header.sourceRevision) || header.sourceRevision < 1) errors.push('invalid-revision');
  return errors;
}

export function validHeaderTransition(from: CollectiveOrderStatus, to: CollectiveOrderStatus): boolean {
  return (from === 'draft' && (to === 'draft' || to === 'reviewed'))
    || (from === 'reviewed' && (to === 'reviewed' || to === 'confirmed'))
    || (from === 'confirmed' && to === 'closed');
}

/** Call only for verified DNS Admin sessions, after the Firestore rules PR is deployed. */
export async function createCollectiveOrderHeader(header: CollectiveOrderHeader, currentUserId: string) {
  const errors = validHeaderInput(header);
  if (errors.length) throw new Error(errors.join(','));
  if (header.status !== 'draft' || header.sourceRevision !== 1) throw new Error('initial-draft-required');
  const ref = doc(db, 'collectiveOrders', header.id);
  await runTransaction(db, async transaction => {
    if ((await transaction.get(ref)).exists()) throw new Error('collective-order-already-exists');
    transaction.set(ref, { ...header, updatedBy: currentUserId, updatedAt: serverTimestamp() });
  });
}

/** Optimistic locking: stale screens may not overwrite a newer revision. */
export async function updateCollectiveOrderHeader(
  header: CollectiveOrderHeader, expectedRevision: number, currentUserId: string,
) {
  const errors = validHeaderInput(header);
  if (errors.length) throw new Error(errors.join(','));
  if (header.sourceRevision !== expectedRevision + 1) throw new Error('revision-mismatch');
  const ref = doc(db, 'collectiveOrders', header.id);
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('collective-order-not-found');
    const previous = snap.data() as CollectiveOrderHeader;
    if (previous.sourceRevision !== expectedRevision) throw new Error('stale-collective-order-revision');
    if (previous.seasonId !== header.seasonId) throw new Error('season-mismatch');
    if (!validHeaderTransition(previous.status, header.status)) throw new Error('invalid-status-transition');
    transaction.set(ref, { ...header, updatedBy: currentUserId, updatedAt: serverTimestamp() });
  });
}

/** Admin only. Client Firestore rules deny this query to non-admins. */
export async function listCollectiveOrderHeaders(): Promise<CollectiveOrderHeader[]> {
  const snapshot = await getDocs(collection(db, 'collectiveOrders'));
  return snapshot.docs.map(item => {
    const data = item.data();
    return {
      id: item.id, seasonId: String(data.seasonId ?? ''), title: String(data.title ?? ''),
      supplierId: String(data.supplierId ?? ''), status: data.status as CollectiveOrderStatus,
      sourceRevision: Number(data.sourceRevision ?? 0),
      supplierDocumentIds: Array.isArray(data.supplierDocumentIds) ? data.supplierDocumentIds as string[] : [],
    };
  });
}
