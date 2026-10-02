type TicketNumberingItem = {
  id: string;
  code: string;
  label: { de: string; it: string; en?: string };
  displayOrder: number;
};

type TicketNumberingOrganization = {
  organizationId: string;
  sourceLabel: string;
};

type TicketNumberingCell = {
  organizationId: string;
  quantity: number | null;
  itemId?: string;
  catalogItemId?: string;
};

export interface TicketNumberingRow {
  itemId: string;
  itemCode: string;
  itemLabel: { de: string; it: string; en?: string };
  organizationId: string;
  organizationLabel: string;
  quantity: number;
  from: number;
  to: number;
}

export interface TicketNumberingResult {
  startNumber: number;
  nextNumber: number;
  totalQuantity: number;
  rows: TicketNumberingRow[];
}

export function formatTicketNumber(value: number, width = 6) {
  return String(value).padStart(width, '0');
}

export function buildTicketNumbering({
  items,
  organizations,
  cells,
  startNumber,
}: {
  items: TicketNumberingItem[];
  organizations: TicketNumberingOrganization[];
  cells: TicketNumberingCell[];
  startNumber: number;
}): TicketNumberingResult {
  if (!Number.isInteger(startNumber) || startNumber < 1) {
    throw new Error('Ticket numbering start number must be a positive integer.');
  }

  const quantityMap = new Map<string, number | null>();
  for (const cell of cells) {
    const itemId = cell.itemId ?? cell.catalogItemId;
    if (!itemId) continue;
    quantityMap.set(`${cell.organizationId}::${itemId}`, cell.quantity);
  }

  const rows: TicketNumberingRow[] = [];
  let cursor = startNumber;

  const orderedItems = [...items].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  for (const item of orderedItems) {
    for (const organization of organizations) {
      const quantity =
        quantityMap.get(`${organization.organizationId}::${item.id}`) ?? 0;

      if (quantity <= 0) continue;
      if (!Number.isInteger(quantity)) {
        throw new Error(
          `Ticket quantity must be an integer: ${organization.organizationId} / ${item.id}`,
        );
      }

      const from = cursor;
      const to = cursor + quantity - 1;
      rows.push({
        itemId: item.id,
        itemCode: item.code,
        itemLabel: item.label,
        organizationId: organization.organizationId,
        organizationLabel: organization.sourceLabel,
        quantity,
        from,
        to,
      });
      cursor = to + 1;
    }
  }

  return {
    startNumber,
    nextNumber: cursor,
    totalQuantity: cursor - startNumber,
    rows,
  };
}
