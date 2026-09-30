import type { PricingDraftRow, ProductCode, SalesChannel, SalesPeriod } from '../types/pricing';

export const productLabels: Record<ProductCode, { de: string; it: string }> = {
  day: { de: 'Tageskarte', it: 'Giornaliero' },
  'wk-area': { de: 'Wochenkarte Gebiet', it: 'Settimanale area' },
  'wk-dns': { de: 'Wochenkarte DNS', it: 'Settimanale DNS' },
  'sk-area': { de: 'Saisonkarte Gebiet', it: 'Stagionale area' },
  'sk-dns': { de: 'Saisonkarte DNS', it: 'Stagionale DNS' },
  'sk-instructor': { de: 'Saisonkarte Langlauflehrer', it: 'Stagionale maestro fondo' },
};

export const channelLabels: Record<SalesChannel, { de: string; it: string }> = {
  official: { de: 'Verkaufsstelle', it: 'Punto vendita' },
  online: { de: 'Online', it: 'Online' },
  track: { de: 'Auf der Loipe', it: 'Sulla pista' },
};

export const periodLabels: Record<SalesPeriod, { de: string; it: string }> = {
  regular: { de: 'Regulär', it: 'Regolare' },
  presale: { de: 'Vorverkauf', it: 'Prevendita' },
};

export function createInitialPricingDraft(
  seasonId: string,
  reportingAreaIds: string[],
): PricingDraftRow[] {
  const rows: PricingDraftRow[] = [
    {
      id: `${seasonId}-network-wk-dns-official-regular`,
      seasonId,
      scopeType: 'network',
      scopeId: 'dolomiti-nordicski',
      productCode: 'wk-dns',
      salesChannel: 'official',
      salesPeriod: 'regular',
      unitPrice: seasonId === '2026-27' ? 65 : null,
      settlementUnitPrice: seasonId === '2026-27' ? 65 : null,
      validFrom: '',
      validTo: '',
      notes: '',
    },
    {
      id: `${seasonId}-network-wk-dns-track-regular`,
      seasonId,
      scopeType: 'network',
      scopeId: 'dolomiti-nordicski',
      productCode: 'wk-dns',
      salesChannel: 'track',
      salesPeriod: 'regular',
      unitPrice: seasonId === '2026-27' ? 75 : null,
      settlementUnitPrice: seasonId === '2026-27' ? 75 : null,
      validFrom: '',
      validTo: '',
      notes: '',
    },
    ...(['sk-dns', 'sk-area', 'sk-instructor'] as const).flatMap((productCode) => [
      {
        id: `${seasonId}-network-${productCode}-official-regular`,
        seasonId,
        scopeType: 'network' as const,
        scopeId: 'dolomiti-nordicski',
        productCode,
        salesChannel: 'official' as const,
        salesPeriod: 'regular' as const,
        unitPrice: null,
        settlementUnitPrice: null,
        validFrom: '',
        validTo: '',
        notes: '',
      },
      ...(productCode === 'sk-dns' || productCode === 'sk-area'
        ? [{
            id: `${seasonId}-network-${productCode}-official-presale`,
            seasonId,
            scopeType: 'network' as const,
            scopeId: 'dolomiti-nordicski',
            productCode,
            salesChannel: 'official' as const,
            salesPeriod: 'presale' as const,
            unitPrice: null,
            settlementUnitPrice: null,
            validFrom: '',
            validTo: '',
            notes: '',
          }]
        : []),
    ]),
  ];

  for (const reportingAreaId of reportingAreaIds) {
    for (const productCode of ['day', 'wk-area'] as const) {
      for (const salesChannel of ['official', 'online', 'track'] as const) {
        rows.push({
          id: `${seasonId}-${reportingAreaId}-${productCode}-${salesChannel}-regular`,
          seasonId,
          scopeType: 'reportingArea',
          scopeId: reportingAreaId,
          productCode,
          salesChannel,
          salesPeriod: 'regular',
          unitPrice: null,
          settlementUnitPrice: null,
          validFrom: '',
          validTo: '',
          notes: '',
        });
      }
    }
  }

  return rows;
}
