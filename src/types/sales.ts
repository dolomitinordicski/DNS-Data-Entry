import type { ProductCode, SalesChannel, SalesPeriod } from './pricing';
export interface SalesDraftRow {
  id: string;
  seasonId: string;
  organizationId: string;
  reportingAreaId: string;
  productCode: ProductCode;
  salesChannel: SalesChannel;
  salesPeriod: SalesPeriod;
  quantity: number | null;
  amountOverride: number | null;
  amountOverrideReason: string;
}
