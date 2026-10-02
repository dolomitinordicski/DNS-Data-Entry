import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './dnsCore';
import type {
  OrderMatrixCategory,
  OrderMatrixDraft,
} from '../types/orderMatrix';

export interface PublicOrderShareDocument {
  id: string;
  seasonId: string;
  category: OrderMatrixCategory;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  snapshot: {
    seasonId: string;
    category: OrderMatrixCategory;
    generatedAt: string;
    title: { de: string; it: string; en: string };
    items: Array<{
      id: string;
      code: string;
      label: { de: string; it: string; en?: string };
      displayOrder: number;
      displayColorHex?: string;
      displayTextColorHex?: string;
      supplierColorReference?: string;
      pocketfolder?: {
        reportingAreaId: string;
        backLanguageOrder: 'de-it-en' | 'it-de-en';
        sourceComparison2025: number;
        sourceAreaTotal2026: number;
        sourcePrinterTotal2026: number;
        areaTotalOrganizationIds: readonly string[];
      };
    }>;
    organizations: Array<{
      organizationId: string;
      sourceLabel: string;
      deliveryLocation?: {
        id: string;
        label: string;
        contactName?: string;
        recipientName: string;
        addressLine1?: string;
        postalLocality?: string;
        phone?: string;
        status: 'verified' | 'needs-confirmation' | 'incomplete';
        notes?: string;
      };
    }>;
    cells: Array<{
      organizationId: string;
      catalogItemId: string;
      quantity: number | null;
    }>;
    totalQuantity: number;
    ticketNumberingStart?: number;
  };
}

function shareTitle(category: OrderMatrixCategory) {
  if (category === 'wristband') {
    return {
      de: 'Armbänder-Bestellung',
      it: 'Ordine braccialetti',
      en: 'Wristband order',
    };
  }
  if (category === 'pocketfolder') {
    return {
      de: 'Pocketfolder-Bestellung & Lieferadressen',
      it: 'Ordine Pocketfolder e indirizzi di consegna',
      en: 'Pocketfolder order & delivery addresses',
    };
  }
  return {
    de: 'Wochen- & Saisonkarten-Bestellung',
    it: 'Ordine settimanali & stagionali',
    en: 'Weekly & season card order',
  };
}

export function buildPublicShareUrl(shareId: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('share', shareId);
  return url.toString();
}

export async function getActivePublicShare(
  seasonId: string,
  category: OrderMatrixCategory,
) {
  const snapshot = await getDocs(collection(db, 'publicOrderShares'));
  const shares = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as PublicOrderShareDocument)
    .filter(
      (share) =>
        share.active &&
        share.seasonId === seasonId &&
        share.category === category,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return shares[0] ?? null;
}

export async function publishPublicOrderShare(
  draft: OrderMatrixDraft,
  options?: { ticketNumberingStart?: number },
): Promise<PublicOrderShareDocument> {
  const existing = await getActivePublicShare(draft.seasonId, draft.category);

  if (existing) {
    await updateDoc(doc(db, 'publicOrderShares', existing.id), {
      active: false,
      updatedAt: new Date().toISOString(),
    });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const totalQuantity = draft.cells.reduce(
    (sum, cell) => sum + (cell.quantity ?? 0),
    0,
  );

  const share: PublicOrderShareDocument = {
    id,
    seasonId: draft.seasonId,
    category: draft.category,
    active: true,
    createdAt: now,
    updatedAt: now,
    snapshot: {
      seasonId: draft.seasonId,
      category: draft.category,
      generatedAt: now,
      title: shareTitle(draft.category),
      items: draft.items.map((item) => ({
        id: item.id,
        code: item.code,
        label: item.label,
        displayOrder: item.displayOrder,
        ...(item.displayColorHex
          ? { displayColorHex: item.displayColorHex }
          : {}),
        ...(item.displayTextColorHex
          ? { displayTextColorHex: item.displayTextColorHex }
          : {}),
        ...(item.supplierColorReference
          ? { supplierColorReference: item.supplierColorReference }
          : {}),
        ...(item.pocketfolder ? { pocketfolder: item.pocketfolder } : {}),
      })),
      organizations: draft.organizations.map((organization) => ({
        organizationId: organization.organizationId,
        sourceLabel: organization.sourceLabel,
        ...(organization.deliveryLocation
          ? { deliveryLocation: organization.deliveryLocation }
          : {}),
      })),
      cells: draft.cells.map((cell) => ({
        organizationId: cell.organizationId,
        catalogItemId: cell.itemId,
        quantity: cell.quantity,
      })),
      totalQuantity,
      ...(draft.category === 'ticket' &&
      Number.isInteger(options?.ticketNumberingStart) &&
      (options?.ticketNumberingStart ?? 0) > 0
        ? { ticketNumberingStart: options!.ticketNumberingStart }
        : {}),
    },
  };

  await setDoc(doc(db, 'publicOrderShares', id), share);
  return share;
}

export async function revokePublicOrderShare(shareId: string) {
  await updateDoc(doc(db, 'publicOrderShares', shareId), {
    active: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function loadPublicOrderShare(shareId: string) {
  const snapshot = await getDoc(doc(db, 'publicOrderShares', shareId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as PublicOrderShareDocument;
}
