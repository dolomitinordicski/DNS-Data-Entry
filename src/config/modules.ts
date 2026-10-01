export type ModuleId =
  | 'season'
  | 'pricing'
  | 'orders'
  | 'sales'
  | 'kp'
  | 'verification';

export interface ModuleDefinition {
  id: ModuleId;
  label: { de: string; it: string };
  subtitle: { de: string; it: string };
  phase: { de: string; it: string };
}

export const modules: ModuleDefinition[] = [
  {
    id: 'season',
    label: { de: 'Saison-Setup', it: 'Setup stagione' },
    subtitle: { de: 'Saison & Grundkonfiguration', it: 'Stagione e configurazione base' },
    phase: { de: 'Grundlage', it: 'Fondazione' },
  },
  {
    id: 'pricing',
    label: { de: 'Tarife', it: 'Tariffe' },
    subtitle: { de: 'DNS- und Gebietstarife', it: 'Tariffe DNS e di area' },
    phase: { de: 'Nächster Schritt', it: 'Prossimo step' },
  },
  {
    id: 'orders',
    label: { de: 'Bestellungen', it: 'Ordini' },
    subtitle: { de: 'Tickets, Armbänder, Pocketfolder & Billing Prep', it: 'Biglietti, braccialetti, Pocketfolder e preparazione billing' },
    phase: { de: 'Geplant', it: 'Pianificato' },
  },
  {
    id: 'sales',
    label: { de: 'Ticket-Verkäufe', it: 'Vendite biglietti' },
    subtitle: { de: 'Verkaufsdaten der Partner', it: 'Dati di vendita dei partner' },
    phase: { de: 'Geplant', it: 'Pianificato' },
  },
  {
    id: 'kp',
    label: { de: 'KP', it: 'KP' },
    subtitle: { de: 'Loipen & Beschneiung', it: 'Piste e innevamento' },
    phase: { de: 'Geplant', it: 'Pianificato' },
  },
  {
    id: 'verification',
    label: { de: 'Prüfung', it: 'Verifica' },
    subtitle: { de: 'Prüfung & Freigabe', it: 'Controllo e approvazione' },
    phase: { de: 'Geplant', it: 'Pianificato' },
  },
];
