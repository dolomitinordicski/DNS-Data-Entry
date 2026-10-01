import type { ProductCode, SalesChannel, SalesPeriod } from './pricing';
export interface SalesDraftRow {
  id: string;
  revision?: number;
  pricing?: { pricingConfigId: string; unitPrice: number; settlementUnitPrice: number; currency: 'EUR' };
  calculatedAmount?: number;
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
