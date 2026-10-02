import { RegionLogos } from '../../components/RegionLogos';
import { createPortal } from 'react-dom';
import { DNS_SHARED_BRAND } from '../../config/brand';
import { buildTicketNumbering, formatTicketNumber } from '../../services/ticketNumbering';
import type {
  OrderMatrixCategory,
  OrderMatrixItem,
  OrderMatrixOrganization,
  OrderMatrixCell,
} from '../../types/orderMatrix';

type Language = 'de' | 'it';

interface Props {
  language: Language;
  seasonId: string;
  category: OrderMatrixCategory;
  items: OrderMatrixItem[];
  organizations: OrderMatrixOrganization[];
  cells: OrderMatrixCell[];
  generatedAt?: string;
  ticketNumberingStart?: number;
}

const copy = {
  de: {
    wristbands: 'Armbänder',
    tickets: 'Wochen- & Saisonkarten',
    pocketfolders: 'Pocketfolder',
    organization: 'Organisation',
    delivery: 'Lieferadresse',
    total: 'Gesamt',
    generatedAt: 'Stand',
    numbering: 'Nummerierung',
    ticketType: 'Ticketart',
    quantity: 'Menge',
    from: 'Von',
    to: 'Bis',
    nextNumber: 'Nächste Startnummer',
  },
  it: {
    wristbands: 'Braccialetti',
    tickets: 'Settimanali & stagionali',
    pocketfolders: 'Pocketfolder',
    organization: 'Organizzazione',
    delivery: 'Indirizzo consegna',
    total: 'Totale',
    generatedAt: 'Aggiornato',
    numbering: 'Numerazione',
    ticketType: 'Tipo tessera',
    quantity: 'Quantità',
    from: 'Da',
    to: 'A',
    nextNumber: 'Prossimo numero iniziale',
  },
} as const;

function formatNumber(value: number, language: Language) {
  return value.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT');
}

export function OrderPrintSheet({
  language,
  seasonId,
  category,
  items,
  organizations,
  cells,
  generatedAt,
  ticketNumberingStart,
}: Props) {
  const t = copy[language];
  const quantities = new Map(
    cells.map((cell) => [
      `${cell.organizationId}::${cell.itemId}`,
      cell.quantity,
    ]),
  );

  const rowTotals = new Map(
    organizations.map((organization) => [
      organization.organizationId,
      items.reduce(
        (sum, item) =>
          sum +
          (quantities.get(`${organization.organizationId}::${item.id}`) ?? 0),
        0,
      ),
    ]),
  );

  const columnTotals = new Map(
    items.map((item) => [
      item.id,
      organizations.reduce(
        (sum, organization) =>
          sum +
          (quantities.get(`${organization.organizationId}::${item.id}`) ?? 0),
        0,
      ),
    ]),
  );

  const grandTotal = [...rowTotals.values()].reduce((sum, value) => sum + value, 0);
  const numbering =
    category === 'ticket' && ticketNumberingStart
      ? buildTicketNumbering({
          items,
          organizations,
          cells,
          startNumber: ticketNumberingStart,
        })
      : null;
  const title =
    category === 'wristband'
      ? t.wristbands
      : category === 'pocketfolder'
        ? t.pocketfolders
        : t.tickets;
  const timestamp = new Date(generatedAt ?? Date.now()).toLocaleString(
    language === 'de' ? 'de-DE' : 'it-IT',
  );

  return createPortal(
    <section className="dns-print-sheet" aria-hidden="true">
      <header className="dns-print-document-header">
        <img
          src={DNS_SHARED_BRAND.printLogoUrl}
          alt="Dolomiti NordicSki"
          className="dns-print-logo"
        />
        <div className="dns-print-document-heading">
          <div className="dns-print-title">{title}</div>
          <div className="dns-print-meta">
            WS {seasonId} · {t.generatedAt}: {timestamp}
          </div>
        </div>
      </header>

      {category === 'wristband' && (
        <div className="dns-print-legend">
          {items.map((item) => (
            <div key={item.id} className="dns-print-legend-item">
              <span
                className="dns-print-swatch"
                style={{ backgroundColor: item.displayColorHex ?? '#FFFFFF' }}
              />
              <span className="dns-print-legend-label">
                {item.label[language]}
              </span>
              <span className="dns-print-legend-ref">
                {item.supplierColorReference ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      <table className="dns-print-table">
        <colgroup>
          <col className="dns-print-col-org" />
          {items.map((item) => (
            <col key={item.id} className="dns-print-col-data" />
          ))}
          <col className="dns-print-col-total" />
        </colgroup>
        <thead>
          <tr>
            <th>{t.organization}</th>
            {items.map((item) => (
              <th key={item.id} className="dns-print-number-header">
                {item.label[language]}
                {category === 'pocketfolder' && item.pocketfolder && (
                  <span className="block text-[7px] font-normal">
                    {item.pocketfolder.backLanguageOrder}
                  </span>
                )}
              </th>
            ))}
            <th className="dns-print-number-header">{t.total}</th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((organization) => (
            <tr key={organization.organizationId}>
              <td>
                <div className="dns-entity-label"><RegionLogos entityType="organization" entityId={organization.organizationId} /><span>{organization.sourceLabel}</span></div>
                {category === 'pocketfolder' && organization.deliveryLocation && (
                  <div className="mt-1 text-[7px] leading-tight">
                    <strong>{t.delivery}:</strong>{' '}
                    {[organization.deliveryLocation.recipientName, organization.deliveryLocation.addressLine1, organization.deliveryLocation.postalLocality, organization.deliveryLocation.phone].filter(Boolean).join(' · ')}
                  </div>
                )}
              </td>
              {items.map((item) => {
                const value =
                  quantities.get(`${organization.organizationId}::${item.id}`) ??
                  null;
                return (
                  <td key={item.id} className="dns-print-number">
                    {value === null ? '—' : formatNumber(value, language)}
                  </td>
                );
              })}
              <td className="dns-print-number dns-print-row-total">
                {formatNumber(
                  rowTotals.get(organization.organizationId) ?? 0,
                  language,
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>{t.total}</th>
            {items.map((item) => (
              <th key={item.id} className="dns-print-number">
                {formatNumber(columnTotals.get(item.id) ?? 0, language)}
              </th>
            ))}
            <th className="dns-print-number">
              {formatNumber(grandTotal, language)}
            </th>
          </tr>
        </tfoot>
      </table>

      {numbering && (
        <div style={{ breakBefore: 'page', pageBreakBefore: 'always', marginTop: '4mm' }}>
          <div className="dns-print-document-header">
            <div className="dns-print-document-heading">
              <div className="dns-print-title">{t.numbering}</div>
              <div className="dns-print-meta">
                WS {seasonId} · {t.nextNumber}: {formatTicketNumber(numbering.nextNumber)}
              </div>
            </div>
          </div>
          <table className="dns-print-table">
            <thead>
              <tr>
                <th>{t.ticketType}</th>
                <th>{t.organization}</th>
                <th className="dns-print-number-header">{t.quantity}</th>
                <th className="dns-print-number-header">{t.from}</th>
                <th className="dns-print-number-header">{t.to}</th>
              </tr>
            </thead>
            <tbody>
              {numbering.rows.map((row) => (
                <tr key={`${row.itemId}::${row.organizationId}`}>
                  <td>{row.itemLabel[language]}</td>
                  <td>{row.organizationLabel}</td>
                  <td className="dns-print-number">{formatNumber(row.quantity, language)}</td>
                  <td className="dns-print-number">{formatTicketNumber(row.from)}</td>
                  <td className="dns-print-number">{formatTicketNumber(row.to)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}>{t.total}</th>
                <th className="dns-print-number">{formatNumber(numbering.totalQuantity, language)}</th>
                <th colSpan={2} className="dns-print-number">
                  {t.nextNumber}: {formatTicketNumber(numbering.nextNumber)}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>,
    document.body,
  );
}
