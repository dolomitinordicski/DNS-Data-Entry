import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ORDER_SOURCE_ORGANIZATIONS_2026_27 } from '@dolomitinordicski/dns-shared-data';
import { db } from './dnsCore';
import type {
  OrderMatrixCategory,
  OrderMatrixDraft,
  OrderMatrixItem,
  OrderMatrixOrganization,
  OrderStatus,
  PersistedOrderMatrix,
  PocketfolderSourceRow,
} from '../types/orderMatrix';

function orderId(
  seasonId: string,
  category: OrderMatrixCategory,
  organizationId: string,
) {
  return `${seasonId}__${category}__${organizationId}`;
}

function lineId(
  seasonId: string,
  category: OrderMatrixCategory,
  organizationId: string,
  itemId: string,
) {
  return `${orderId(seasonId, category, organizationId)}__${itemId}`;
}

function fallbackOrganization(organizationId: string) {
  return ORDER_SOURCE_ORGANIZATIONS_2026_27.find(
    (organization) => organization.organizationId === organizationId,
  );
}

export async function loadPersistedOrderMatrix({
  seasonId,
  category,
  visibleOrganizationIds,
  organizationAreaById,
}: {
  seasonId: string;
  category: OrderMatrixCategory;
  visibleOrganizationIds: Set<string>;
  organizationAreaById: Record<string, string | undefined>;
}): Promise<PersistedOrderMatrix> {
  const [catalogSnapshot, formSnapshot, deliverySnapshot] = await Promise.all([
    getDocs(collection(db, 'orderCatalogItems')),
    getDoc(doc(db, 'orderFormConfigs', `${seasonId}-${category}`)),
    category === 'pocketfolder'
      ? getDocs(collection(db, 'deliveryLocations'))
      : Promise.resolve(null),
  ]);

  if (!formSnapshot.exists()) {
    throw new Error(`Missing order form config for ${seasonId}/${category}`);
  }

  const form = formSnapshot.data() as {
    organizationIds?: string[];
    catalogItemIds?: string[];
  };

  const catalogById = new Map(
    catalogSnapshot.docs.map((item) => [
      item.id,
      { id: item.id, ...item.data() } as OrderMatrixItem,
    ]),
  );

  const items = (form.catalogItemIds ?? [])
    .map((id) => catalogById.get(id))
    .filter((item): item is OrderMatrixItem => Boolean(item))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const organizationIds = (form.organizationIds ?? []).filter((id) =>
    visibleOrganizationIds.has(id),
  );

  const deliveryById = new Map<string, NonNullable<OrderMatrixOrganization['deliveryLocation']>>(
    deliverySnapshot?.docs.map((item) => [
      item.id,
      { id: item.id, ...item.data() } as NonNullable<OrderMatrixOrganization['deliveryLocation']>,
    ]) ?? [],
  );

  const organizations = organizationIds.map((organizationId) => {
    const fallback = fallbackOrganization(organizationId);
    const defaultDeliveryLocationId = fallback?.defaultDeliveryLocationId;
    const deliveryLocation = defaultDeliveryLocationId
      ? deliveryById.get(defaultDeliveryLocationId)
      : undefined;

    return {
      organizationId,
      reportingAreaId: organizationAreaById[organizationId],
      sourceLabel: fallback?.sourceLabel ?? organizationId,
      ...(defaultDeliveryLocationId ? { defaultDeliveryLocationId } : {}),
      ...(deliveryLocation ? { deliveryLocation } : {}),
    };
  });

  const persistedOrderIds = new Set<string>();
  const persistedLineIds = new Set<string>();
  const orderStatuses: Record<string, OrderStatus> = {};

  await Promise.all(
    organizations.map(async (organization) => {
      const id = orderId(seasonId, category, organization.organizationId);
      const snapshot = await getDoc(doc(db, 'ticketOrders', id));
      if (snapshot.exists()) {
        persistedOrderIds.add(id);
        const status = snapshot.data().status;
        orderStatuses[organization.organizationId] =
          status === 'submitted' || status === 'confirmed' || status === 'fulfilled' || status === 'cancelled'
            ? status
            : 'draft';
      } else {
        orderStatuses[organization.organizationId] = 'draft';
      }
    }),
  );

  const cells = await Promise.all(
    organizations.flatMap((organization) =>
      items.map(async (item) => {
        const id = lineId(
          seasonId,
          category,
          organization.organizationId,
          item.id,
        );
        const snapshot = await getDoc(doc(db, 'ticketOrderLines', id));
        if (snapshot.exists()) {
          persistedLineIds.add(id);
          const quantity = snapshot.data().quantity;
          return {
            organizationId: organization.organizationId,
            itemId: item.id,
            quantity: typeof quantity === 'number' ? quantity : null,
          };
        }
        return {
          organizationId: organization.organizationId,
          itemId: item.id,
          quantity: null,
        };
      }),
    ),
  );

  return {
    draft: {
      seasonId,
      category,
      items,
      organizations,
      cells,
    },
    persistedOrderIds,
    persistedLineIds,
    orderStatuses,
  };
}

export async function loadPocketfolderSourceRows(
  seasonId: string,
): Promise<PocketfolderSourceRow[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'pocketfolderSourceRows'),
      where('seasonId', '==', seasonId),
    ),
  );

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as PocketfolderSourceRow))
    .sort((a, b) => a.sourceRow - b.sourceRow);
}

export async function savePersistedOrderMatrix({
  draft,
  persistedOrderIds,
  persistedLineIds,
  headerStatus,
}: {
  draft: OrderMatrixDraft;
  persistedOrderIds: Set<string>;
  persistedLineIds: Set<string>;
  headerStatus?: OrderStatus;
}) {
  const batch = writeBatch(db);
  let writeCount = 0;

  for (const organization of draft.organizations) {
    const headerId = orderId(
      draft.seasonId,
      draft.category,
      organization.organizationId,
    );

    if (!persistedOrderIds.has(headerId)) {
      const header: Record<string, unknown> = {
        id: headerId,
        seasonId: draft.seasonId,
        category: draft.category,
        organizationId: organization.organizationId,
        status: headerStatus ?? 'draft',
        provenance: {
          sourceSystem: 'manual-data-entry',
          methodVersion: 1,
          dataStatus: 'draft',
        },
      };
      if (organization.reportingAreaId) {
        header.reportingAreaId = organization.reportingAreaId;
      }

      if (headerStatus === 'submitted') {
        header.submittedAt = serverTimestamp();
      }
      header.updatedAt = serverTimestamp();

      batch.set(doc(db, 'ticketOrders', headerId), header);
      writeCount += 1;
    } else if (headerStatus) {
      batch.update(doc(db, 'ticketOrders', headerId), {
        status: headerStatus,
        updatedAt: serverTimestamp(),
        ...(headerStatus === 'submitted' ? { submittedAt: serverTimestamp() } : {}),
      });
      writeCount += 1;
    }

    for (const item of draft.items) {
      const cell = draft.cells.find(
        (candidate) =>
          candidate.organizationId === organization.organizationId &&
          candidate.itemId === item.id,
      );
      const id = lineId(
        draft.seasonId,
        draft.category,
        organization.organizationId,
        item.id,
      );

      if (!cell || cell.quantity === null) {
        if (persistedLineIds.has(id)) {
          batch.delete(doc(db, 'ticketOrderLines', id));
          writeCount += 1;
        }
        continue;
      }

      if (persistedLineIds.has(id)) {
        batch.update(doc(db, 'ticketOrderLines', id), {
          quantity: cell.quantity,
        });
        writeCount += 1;
        continue;
      }

      const line: Record<string, unknown> = {
        id,
        ticketOrderId: headerId,
        seasonId: draft.seasonId,
        organizationId: organization.organizationId,
        catalogItemId: item.id,
        quantity: cell.quantity,
        provenance: {
          sourceSystem: 'manual-data-entry',
          methodVersion: 1,
          dataStatus: 'draft',
        },
      };
      if (organization.reportingAreaId) {
        line.reportingAreaId = organization.reportingAreaId;
      }
      if (item.productCode) {
        line.productCode = item.productCode;
      }

      batch.set(doc(db, 'ticketOrderLines', id), line);
      writeCount += 1;
    }
  }

  if (writeCount === 0) return 0;

  await batch.commit();
  return writeCount;
}
