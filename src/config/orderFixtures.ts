import {
  ORDER_CATALOG_2026_27,
  ORDER_SOURCE_ORGANIZATIONS_2026_27,
  POCKETFOLDER_ITEMS_2026_27,
  POCKETFOLDER_SOURCE_CELLS_2026_27,
  POCKETFOLDER_SOURCE_ORGANIZATIONS_2026_27,
  TICKET_SOURCE_CELLS_2026_27,
  WRISTBAND_SOURCE_CELLS_2026_27,
} from '@dolomitinordicski/dns-shared-data';
import type { OrderMatrixCategory, OrderMatrixDraft } from '../types/orderMatrix';

function sourceDraft(
  category: OrderMatrixCategory,
  items: readonly { id: string; category: string; code: string; label: { de: string; it: string; en?: string }; displayOrder: number; [key: string]: unknown }[],
  organizations: readonly { organizationId: string; sourceLabel: string; reportingAreaId?: string; defaultDeliveryLocationId?: string }[],
  sourceCells: readonly { organizationId: string; catalogItemId: string; quantity: number | null }[],
): OrderMatrixDraft {
  return {
    seasonId: '2026-27',
    category,
    items: items.map((item) => ({
      ...item,
      category,
      label: { ...item.label },
    })),
    organizations: organizations.map((organization) => ({ ...organization })),
    cells: sourceCells.map((cell) => ({
      organizationId: cell.organizationId,
      itemId: cell.catalogItemId,
      quantity: cell.quantity,
    })),
  };
}

const wristbandOrganizations = ORDER_SOURCE_ORGANIZATIONS_2026_27
  .filter((organization) => organization.wristbandSourceRow);
const ticketOrganizations = ORDER_SOURCE_ORGANIZATIONS_2026_27
  .filter((organization) => organization.ticketSourceRow);

export const ORDER_DEVELOPMENT_DRAFTS_2026_27: Record<OrderMatrixCategory, OrderMatrixDraft> = {
  wristband: sourceDraft(
    'wristband',
    ORDER_CATALOG_2026_27.filter((item) => item.category === 'wristband'),
    wristbandOrganizations,
    WRISTBAND_SOURCE_CELLS_2026_27,
  ),
  ticket: sourceDraft(
    'ticket',
    ORDER_CATALOG_2026_27.filter((item) => item.category === 'ticket'),
    ticketOrganizations,
    TICKET_SOURCE_CELLS_2026_27,
  ),
  pocketfolder: sourceDraft(
    'pocketfolder',
    POCKETFOLDER_ITEMS_2026_27,
    POCKETFOLDER_SOURCE_ORGANIZATIONS_2026_27,
    POCKETFOLDER_SOURCE_CELLS_2026_27,
  ),
};

export function cloneOrderDraft(source: OrderMatrixDraft): OrderMatrixDraft {
  return {
    ...source,
    items: source.items.map((item) => ({ ...item, label: { ...item.label } })),
    organizations: source.organizations.map((organization) => ({ ...organization })),
    cells: source.cells.map((cell) => ({ ...cell })),
  };
}
