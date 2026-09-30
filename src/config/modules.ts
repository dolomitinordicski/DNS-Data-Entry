export type ModuleId =
  | 'season'
  | 'pricing'
  | 'orders'
  | 'sales'
  | 'kp'
  | 'verification';

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  subtitle: string;
  phase: string;
}

export const modules: ModuleDefinition[] = [
  { id: 'season', label: 'Season Setup', subtitle: 'Saison & Grundkonfiguration', phase: 'Foundation' },
  { id: 'pricing', label: 'Pricing', subtitle: 'DNS- und Gebietstarife', phase: 'Next' },
  { id: 'orders', label: 'Ticket Orders', subtitle: 'Bestellungen & Billing Prep', phase: 'Planned' },
  { id: 'sales', label: 'Ticket Sales', subtitle: 'Verkaufsdaten der Partner', phase: 'Planned' },
  { id: 'kp', label: 'KP', subtitle: 'Loipen & Beschneiung', phase: 'Planned' },
  { id: 'verification', label: 'Verification', subtitle: 'Prüfung & Freigabe', phase: 'Planned' },
];
