export type PricingScope = 'network' | 'reportingArea' | 'organization';
export type SalesChannel = 'official' | 'online' | 'track';
export type SalesPeriod = 'regular' | 'presale';

export type ProductCode =
  | 'day'
  | 'wk-area'
  | 'wk-dns'
  | 'sk-area'
  | 'sk-dns'
  | 'sk-instructor';

export interface PricingDraftRow {
  id: string;
  revision?: number;
  seasonId: string;
  scopeType: PricingScope;
  scopeId: string;
  productCode: ProductCode;
  salesChannel: SalesChannel;
  salesPeriod: SalesPeriod;
  unitPrice: number | null;
  settlementUnitPrice: number | null;
  validFrom: string;
  validTo: string;
  notes: string;
}
