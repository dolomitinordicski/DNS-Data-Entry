export type OrderMatrixCategory = 'wristband' | 'ticket';

export interface OrderMatrixItem {
  id: string;
  category: OrderMatrixCategory;
  code: string;
  label: { de: string; it: string };
  displayOrder: number;
  productCode?: string;
  physicalVariantCode?: string;
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
