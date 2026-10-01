export type OrderMatrixCategory = 'wristband' | 'ticket' | 'pocketfolder';

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
  pocketfolder?: {
    reportingAreaId: string;
    backLanguageOrder: 'de-it-en' | 'it-de-en';
    sourceComparison2025: number;
    sourceAreaTotal2026: number;
    sourcePrinterTotal2026: number;
    areaTotalOrganizationIds: string[];
  };
}

export interface OrderMatrixOrganization {
  organizationId: string;
  reportingAreaId?: string;
  sourceLabel: string;
  defaultDeliveryLocationId?: string;
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
