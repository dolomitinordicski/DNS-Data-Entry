import {
  DNS_DATA_CONTRACTS,
  DNS_DATA_CONTRACTS_VERSION,
} from '@dolomitinordicski/dns-shared-data/data-contracts';
import type { ModuleId } from './modules';

const CONTRACT_IDS_BY_MODULE: Record<ModuleId, readonly string[]> = {
  season: ['master-reference'],
  pricing: ['pricing'],
  orders: ['order-catalog', 'ticket-orders'],
  sales: ['ticket-sales'],
  kp: ['kp'],
  verification: ['submissions-revisions'],
};

export { DNS_DATA_CONTRACTS_VERSION };

export function dataContractsForModule(moduleId: ModuleId) {
  const ids = CONTRACT_IDS_BY_MODULE[moduleId];
  return DNS_DATA_CONTRACTS.filter((contract) => ids.includes(contract.id));
}
