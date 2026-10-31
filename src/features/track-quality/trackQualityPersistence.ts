import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth } from '../../services/auth';
import { db } from '../../services/dnsCore';

export type TrackQualityStatus = 'yes' | 'partial' | 'no' | 'unreported';
export interface TrackQualityRow {
  id: string;
  seasonId: string;
  reportingAreaId: string;
  organizationId: string;
  trackName: string;
  totalKm: number | null;
  earlyDecember: TrackQualityStatus;
  earlyDecemberKm: number | null;
  lateDecember: TrackQualityStatus;
  lateDecemberKm: number | null;
  closedAt: string;
  notes: string;
  revision: number;
}

const prefix = (seasonId: string, reportingAreaId: string, organizationId: string) =>
  [seasonId, reportingAreaId, organizationId].join('__');

export async function loadTrackQuality(seasonId: string, reportingAreaId: string, organizationId: string) {
  if (!auth.currentUser) throw new Error('LOGIN_REQUIRED');
  const snapshot = await getDocs(query(
    collection(db, 'trackQualityReports'),
    where('seasonId', '==', seasonId),
    where('reportingAreaId', '==', reportingAreaId),
    where('organizationId', '==', organizationId),
  ));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as TrackQualityRow));
}

export function validateTrackQuality(row: TrackQualityRow) {
  if (!row.trackName.trim()) throw new Error('TRACK_NAME_REQUIRED');
  if (row.totalKm === null || !Number.isFinite(row.totalKm) || row.totalKm <= 0) throw new Error('INVALID_TRACK_KM');
  for (const [status, km] of [[row.earlyDecember, row.earlyDecemberKm], [row.lateDecember, row.lateDecemberKm]] as const) {
    if (status === 'partial' && (km === null || !Number.isFinite(km) || km <= 0 || km > row.totalKm)) throw new Error('INVALID_PARTIAL_KM');
    if (status !== 'partial' && km !== null) throw new Error('PARTIAL_KM_NOT_APPLICABLE');
  }
}

export async function saveTrackQuality(row: TrackQualityRow) {
  if (!auth.currentUser) throw new Error('LOGIN_REQUIRED');
  validateTrackQuality(row);
  if (!row.seasonId || !row.reportingAreaId || !row.organizationId) throw new Error('MISSING_SCOPE');
  if (!row.id.startsWith(prefix(row.seasonId, row.reportingAreaId, row.organizationId) + '__')) throw new Error('INVALID_SCOPE');
  const ref = doc(db, 'trackQualityReports', row.id);
  return runTransaction(db, async (tx) => {
    const current = await tx.get(ref);
    const previous = current.exists() ? current.data() : null;
    const revision = Number(previous?.revision ?? 0);
    if (revision !== row.revision) throw new Error('CONFLICT_RELOAD');
    if (previous?.provenance?.dataStatus && previous.provenance.dataStatus !== 'draft') throw new Error('RECORD_LOCKED');
    if (previous) tx.set(doc(ref, 'revisions', String(revision)), previous);
    tx.set(ref, {
      ...row, revision: revision + 1,
      provenance: { sourceSystem: 'manual-data-entry', methodVersion: 1, dataStatus: 'draft' },
      updatedAt: serverTimestamp(), updatedBy: auth.currentUser!.uid,
    });
    return revision + 1;
  });
}

export function createTrackQualityDraft(seasonId: string, reportingAreaId: string, organizationId: string): TrackQualityRow {
  return {
    id: prefix(seasonId, reportingAreaId, organizationId) + '__' + crypto.randomUUID(),
    seasonId, reportingAreaId, organizationId, trackName: '', totalKm: null,
    earlyDecember: 'unreported', earlyDecemberKm: null,
    lateDecember: 'unreported', lateDecemberKm: null,
    closedAt: '', notes: '', revision: 0,
  };
}
