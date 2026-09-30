import type { OrderMatrixDraft } from '../types/orderMatrix';

const wristbandItems = [
  { id: 'wristband-14-yellow', category: 'wristband', code: '14-yellow', label: { de: '14 yellow', it: '14 yellow' }, displayOrder: 1, physicalVariantCode: '14 yellow', displayColorHex: '#FFD91A', displayTextColorHex: '#111111', supplierColorReference: '803C' },
  { id: 'wristband-16-red', category: 'wristband', code: '16-red', label: { de: '16 red', it: '16 red' }, displayOrder: 2, physicalVariantCode: '16 red', displayColorHex: '#E51D2A', displayTextColorHex: '#FFFFFF', supplierColorReference: '185C' },
  { id: 'wristband-33-grape', category: 'wristband', code: '33-grape', label: { de: '33 grape', it: '33 grape' }, displayOrder: 3, physicalVariantCode: '33 grape', displayColorHex: '#C74398', displayTextColorHex: '#111111', supplierColorReference: '807C' },
  { id: 'wristband-15-light-green', category: 'wristband', code: '15-light-green', label: { de: '15 light green', it: '15 light green' }, displayOrder: 4, physicalVariantCode: '15 light green', displayColorHex: '#45A276', displayTextColorHex: '#FFFFFF', supplierColorReference: 'CMYK · reorder 34186062' },
  { id: 'wristband-13-blue', category: 'wristband', code: '13-blue', label: { de: '13 blue', it: '13 blue' }, displayOrder: 5, physicalVariantCode: '13 blue', displayColorHex: '#1088B8', displayTextColorHex: '#111111', supplierColorReference: 'Process Blue C' },
  { id: 'wristband-20-black', category: 'wristband', code: '20-black', label: { de: '20 black', it: '20 black' }, displayOrder: 6, physicalVariantCode: '20 black', displayColorHex: '#272324', displayTextColorHex: '#FFFFFF', supplierColorReference: 'Black' },
  { id: 'wristband-51-gold', category: 'wristband', code: '51-gold', label: { de: '51 gold', it: '51 gold' }, displayOrder: 7, physicalVariantCode: '51 gold', displayColorHex: '#97805A', displayTextColorHex: '#111111', supplierColorReference: '872C' },
  { id: 'wristband-11-white', category: 'wristband', code: '11-white', label: { de: '11 white', it: '11 white' }, displayOrder: 8, physicalVariantCode: '11 white', displayColorHex: '#FFFFFF', displayTextColorHex: '#111111', supplierColorReference: '—' },
] as const;

const ticketItems = [
  { id: 'wk-area', category: 'ticket', code: 'wk-area', label: { de: 'Wochenkarte Lokal', it: 'Settimanale locale' }, displayOrder: 1, productCode: 'wk-area' },
  { id: 'wk-dns', category: 'ticket', code: 'wk-dns', label: { de: 'Wochenkarte DNS', it: 'Settimanale DNS' }, displayOrder: 2, productCode: 'wk-dns' },
  { id: 'sk-area', category: 'ticket', code: 'sk-area', label: { de: 'Saisonkarte Lokal', it: 'Stagionale locale' }, displayOrder: 3, productCode: 'sk-area' },
  { id: 'sk-dns', category: 'ticket', code: 'sk-dns', label: { de: 'Saisonkarte DNS', it: 'Stagionale DNS' }, displayOrder: 4, productCode: 'sk-dns' },
  { id: 'complimentary', category: 'ticket', code: 'complimentary', label: { de: 'Freikarten', it: 'Biglietti in omaggio' }, displayOrder: 5 },
  { id: 'sk-instructor', category: 'ticket', code: 'sk-instructor', label: { de: 'Langlauflehrer-Karten', it: 'Tessere maestri sci fondo' }, displayOrder: 6, productCode: 'sk-instructor' },
  { id: 'press', category: 'ticket', code: 'press', label: { de: 'PRESS', it: 'PRESS' }, displayOrder: 7 },
] as const;

const partnerRows = [
  { organizationId: 'antholzertal', reportingAreaId: 'antholzertal', sourceLabel: 'Antholzertal (für TV)' },
  { organizationId: 'biathlon-antholz', reportingAreaId: 'antholzertal', sourceLabel: 'Antholzertal (für Biathlon)' },
  { organizationId: 'gsiesertal-welsberg-taisten', reportingAreaId: 'gsiesertal-welsberg-taisten', sourceLabel: 'Gsies-Welsberg-Taisten' },
  { organizationId: 'tv-toblach', reportingAreaId: 'drei-zinnen', sourceLabel: '3ZD - Toblach' },
  { organizationId: 'tv-niederdorf', reportingAreaId: 'drei-zinnen', sourceLabel: '3ZD - Niederdorf' },
  { organizationId: 'tv-innichen', reportingAreaId: 'drei-zinnen', sourceLabel: '3ZD - Innichen' },
  { organizationId: 'tv-sexten', reportingAreaId: 'drei-zinnen', sourceLabel: '3ZD - Sexten' },
  { organizationId: 'tv-prags', reportingAreaId: 'drei-zinnen', sourceLabel: '3ZD - Prags' },
  { organizationId: 'tvb-osttirol', reportingAreaId: 'osttirol', sourceLabel: 'Osttirol' },
  { organizationId: 'val-comelico', reportingAreaId: 'val-comelico', sourceLabel: 'Comelico' },
  { organizationId: 'servizi-ampezzo', reportingAreaId: 'cortina-d-ampezzo', sourceLabel: 'Cortina' },
  { organizationId: 'sand-in-taufers', reportingAreaId: 'ahrntal', sourceLabel: 'TV Sand in Taufers' },
  { organizationId: 'ahrntal', reportingAreaId: 'ahrntal', sourceLabel: 'TV Ahrntal' },
  { organizationId: 'val-gardena', reportingAreaId: 'seiser-alm-dolomites-val-gardena', sourceLabel: 'Gröden' },
  { organizationId: 'seiser-alm-marketing', reportingAreaId: 'seiser-alm-dolomites-val-gardena', sourceLabel: 'Seiser Alm' },
] as const;

const dnsRow = { organizationId: 'dolomiti-nordicski', sourceLabel: 'Dolomiti Nordicski' } as const;

function cells(
  rows: readonly { organizationId: string }[],
  items: readonly { id: string }[],
  matrix: readonly (readonly (number | null)[])[],
) {
  return rows.flatMap((row, rowIndex) =>
    items.map((item, columnIndex) => ({
      organizationId: row.organizationId,
      itemId: item.id,
      quantity: matrix[rowIndex][columnIndex] ?? null,
    })),
  );
}

export const wristbandOrderDraft2026: OrderMatrixDraft = {
  seasonId: '2026-27',
  category: 'wristband',
  items: [...wristbandItems],
  organizations: [...partnerRows],
  cells: cells(partnerRows, wristbandItems, [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [500, 1000, 700, 900, 800, 900, 1500, 0],
    [1200, 1800, 1300, 1200, 1500, 1400, 1300, 0],
    [0, 1100, 0, 0, 0, 100, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [400, 0, 0, 200, 0, 600, 500, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1500, 2000, 1000, 1500, 2000, 1500, 1500, 0],
    [250, 250, 250, 250, 250, 250, 0, null],
    [0, 0, 0, 0, 0, 0, 0, null],
    [600, 600, 600, 600, 600, 600, 600, 0],
    [400, 400, 400, 400, 400, 400, 400, 0],
    [400, 400, 400, 400, 400, 400, 400, 0],
    [2000, 2500, 2000, 2000, 2000, 2000, 2000, 0],
  ]),
};

export const ticketOrderDraft2026: OrderMatrixDraft = {
  seasonId: '2026-27',
  category: 'ticket',
  items: [...ticketItems],
  organizations: [...partnerRows, dnsRow],
  cells: cells([...partnerRows, dnsRow], ticketItems, [
    [350, 450, 350, 600, 20, 15, 0],
    [500, 350, 60, 80, 10, 20, 0],
    [800, 1000, 600, 800, 0, 5, 0],
    [1600, 2200, 350, 500, 0, 30, 0],
    [120, 400, 100, 200, 0, 5, 0],
    [200, 200, 100, 120, 0, 5, 0],
    [700, 200, 200, 200, 0, 5, 0],
    [200, 400, 50, 80, null, null, null],
    [1500, 1000, 2000, 1000, 5, 0, 5],
    [50, 50, 150, 150, 5, 20, 0],
    [100, 40, 300, 150, 20, 20, 10],
    [200, 100, 100, 200, 0, 5, 0],
    [150, 50, 150, 100, 10, 0, 0],
    [80, 20, 100, 60, 25, null, 5],
    [1500, 50, 200, 20, 30, 20, 20],
    [0, 250, 0, 200, 0, 0, 20],
  ]),
};

export function cloneOrderDraft(source: OrderMatrixDraft): OrderMatrixDraft {
  return {
    ...source,
    items: source.items.map((item) => ({ ...item, label: { ...item.label } })),
    organizations: source.organizations.map((organization) => ({ ...organization })),
    cells: source.cells.map((cell) => ({ ...cell })),
  };
}
