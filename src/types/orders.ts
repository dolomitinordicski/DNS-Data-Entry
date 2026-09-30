export type TicketOrderStatus = 'draft' | 'submitted' | 'confirmed' | 'fulfilled' | 'cancelled';

export interface TicketOrderRow {
  id: string;
  seasonId: string;
  orderNumber?: string;
  orderDate: string;
  organizationId: string;
  reportingAreaId: string;
  status: TicketOrderStatus;
  lineCount: number;
  totalQuantity: number;
  calculatedAmount: number;
  sourceSystem?: string;
  dataStatus?: string;
}
