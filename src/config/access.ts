import type { ModuleId } from './modules';
import type { DNSPermission } from '../types/access';

export const MODULE_READ_PERMISSION: Record<ModuleId, DNSPermission> = {
  season: 'season.read',
  pricing: 'pricing.read',
  orders: 'ticketOrders.read',
  sales: 'ticketSales.read',
  kp: 'kp.read',
  verification: 'verification.read',
};
