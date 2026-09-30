export type OrderMatrixCategory = 'wristband' | 'ticket';

export interface OrderMatrixItem {
  id: string;
  category: OrderMatrixCategory;
  code: string;
  label: { de: string; it: string; en?: string };
  displayOrder: number;
  productCode?: string;
  physicalVariantCode?: string;
  displayColorHex?: string;
  displayTextColorHex?: string;
  supplierColorReference?: string;
}

export interface OrderMatrixOrganization {
  organizationId: string;
  reportingAreaId?: string;
  sourceLabel: string;
}

export interface OrderMatrixCell {
  organizationId: string;
  itemId: string;
  quantity: number | null;
}

export interface OrderMatrixDraft {
  seasonId: string;
  category: OrderMatrixCategory;
  items: OrderMatrixItem[];
  organizations: OrderMatrixOrganization[];
  cells: OrderMatrixCell[];
}

export interface PersistedOrderMatrix {
  draft: OrderMatrixDraft;
  persistedOrderIds: Set<string>;
  persistedLineIds: Set<string>;
}
