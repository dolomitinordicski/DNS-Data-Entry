import { RegionLogos } from '../../components/RegionLogos';
import { useEffect, useMemo, useState } from 'react';
import { DNS_SHARED_BRAND } from '../../config/brand';
import { OrderPrintSheet } from './OrderPrintSheet';
import {
  loadPublicOrderShare,
  type PublicOrderShareDocument,
} from '../../services/publicOrderShares';
import {
  exportPublicOrderCsv,
  exportPublicOrderExcel,
} from '../../services/orderExport';
import { buildTicketNumbering, formatTicketNumber } from '../../services/ticketNumbering';

type Language = 'de' | 'it';

const copy = {
  de: {
    supplierView: 'Lieferantenansicht',
    loading: 'Bestellung wird geladen…',
    unavailable: 'Dieser öffentliche Link ist nicht verfügbar oder wurde widerrufen.',
    print: 'Drucken',
    exportCsv: 'CSV exportieren',
    exportExcel: 'Excel exportieren',
    total: 'Gesamt',
    organization: 'Organisation',
    generatedAt: 'Stand',
    legend: 'Farb-Legende',
    supplierRef: 'Lieferantenreferenz',
    delivery: 'Lieferadresse',
    addressWarning: 'Adresse vor Versand bestätigen',
    numbering: 'Nummerierung',
    ticketType: 'Ticketart',
    quantity: 'Menge',
    from: 'Von',
    to: 'Bis',
    startNumber: 'Startnummer',
    nextNumber: 'Nächste Startnummer',
  },
  it: {
    supplierView: 'Vista fornitore',
    loading: 'Caricamento ordine…',
    unavailable: 'Questo link pubblico non è disponibile oppure è stato revocato.',
    print: 'Stampa',
    exportCsv: 'Esporta CSV',
    exportExcel: 'Esporta Excel',
    total: 'Totale',
    organization: 'Organizzazione',
    generatedAt: 'Aggiornato',
    legend: 'Legenda colori',
    supplierRef: 'Riferimento fornitore',
    delivery: 'Indirizzo consegna',
    addressWarning: 'Confermare indirizzo prima della spedizione',
    numbering: 'Numerazione',
    ticketType: 'Tipo tessera',
    quantity: 'Quantità',
    from: 'Da',
    to: 'A',
    startNumber: 'Numero iniziale',
    nextNumber: 'Prossimo numero iniziale',
  },
} as const;

function formatNumber(value: number, language: Language) {
  return value.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT');
}

export function PublicOrderSharePage({
  shareId,
}: {
  shareId: string;
}) {
  const [language, setLanguage] = useState<Language>('de');
  const [share, setShare] = useState<PublicOrderShareDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const t = copy[language];

  useEffect(() => {
    loadPublicOrderShare(shareId)
      .then(setShare)
      .catch((error) => {
        console.error('Public order share load failed', error);
        setShare(null);
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  const quantities = useMemo(() => {
    if (!share) return new Map<string, number | null>();
    return new Map(
      share.snapshot.cells.map((cell) => [
        `${cell.organizationId}::${cell.catalogItemId}`,
        cell.quantity,
      ]),
    );
  }, [share]);

  const rowTotals = useMemo(() => {
    if (!share) return new Map<string, number>();
    return new Map(
      share.snapshot.organizations.map((organization) => [
        organization.organizationId,
        share.snapshot.items.reduce(
          (sum, item) =>
            sum +
            (quantities.get(
              `${organization.organizationId}::${item.id}`,
            ) ?? 0),
          0,
        ),
      ]),
    );
  }, [share, quantities]);

  const columnTotals = useMemo(() => {
    if (!share) return new Map<string, number>();
    return new Map(
      share.snapshot.items.map((item) => [
        item.id,
        share.snapshot.organizations.reduce(
          (sum, organization) =>
            sum +
            (quantities.get(
              `${organization.organizationId}::${item.id}`,
            ) ?? 0),
          0,
        ),
      ]),
    );
  }, [share, quantities]);

  const numbering = useMemo(() => {
    if (
      !share ||
      share.snapshot.category !== 'ticket' ||
      !share.snapshot.ticketNumberingStart
    ) {
      return null;
    }
    return buildTicketNumbering({
      items: share.snapshot.items,
      organizations: share.snapshot.organizations,
      cells: share.snapshot.cells,
      startNumber: share.snapshot.ticketNumberingStart,
    });
  }, [share]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dns-bg">
        <div className="dns-kicker">{t.loading}</div>
      </div>
    );
  }

  if (!share || !share.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dns-bg px-5">
        <section className="dns-card max-w-[620px] p-8 text-center">
          <div className="dns-section-title">{t.unavailable}</div>
        </section>
      </div>
    );
  }

  const snapshot = share.snapshot;
  const title =
    language === 'de' ? snapshot.title.de : snapshot.title.it;

  return (
    <div className="min-h-screen bg-dns-bg">
      <header className="no-print bg-dns-deep text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-4">
            <img src={DNS_SHARED_BRAND.webLogoUrl} alt="Dolomiti NordicSki" className="h-10 w-auto" />
            <div>
              <div className="text-[20px] uppercase tracking-[.035em]">
                <strong>DNS</strong> <span className="font-normal">ORDERS</span>
              </div>
              <div className="mt-1 font-alt text-[10px] uppercase tracking-[.06em] text-dns-light">
                {t.supplierView}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-3 text-[10px] font-bold uppercase tracking-[.06em]">
              {(['de', 'it'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={[
                    'border-0 border-b-2 bg-transparent px-1 py-1 text-white transition',
                    language === lang
                      ? 'border-white'
                      : 'border-transparent opacity-60',
                  ].join(' ')}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            {share && (
              <>
                <button
                  type="button"
                  onClick={() => exportPublicOrderCsv(share, language)}
                  className="rounded-md border border-white/30 bg-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-[.05em] text-white"
                >
                  {t.exportCsv}
                </button>
                <button
                  type="button"
                  onClick={() => exportPublicOrderExcel(share, language)}
                  className="rounded-md border border-white/30 bg-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-[.05em] text-white"
                >
                  {t.exportExcel}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-white/30 bg-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-[.05em] text-white"
            >
              {t.print}
            </button>
          </div>
        </div>
      </header>

      <main className="order-print-area mx-auto max-w-[1440px] px-5 py-6 md:px-8">
        <OrderPrintSheet
          language={language}
          seasonId={snapshot.seasonId}
          category={snapshot.category}
          items={snapshot.items.map((item) => ({
            ...item,
            category: snapshot.category,
          }))}
          organizations={snapshot.organizations}
          cells={snapshot.cells.map((cell) => ({
            organizationId: cell.organizationId,
            itemId: cell.catalogItemId,
            quantity: cell.quantity,
          }))}
          generatedAt={snapshot.generatedAt}
          ticketNumberingStart={snapshot.ticketNumberingStart}
        />

        <section className="dns-card p-5 md:p-6 print-flat">
          <div className="dns-kicker">WS {snapshot.seasonId}</div>
          <h1 className="mt-1 text-[26px] font-semibold text-dns-deep">{title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="dns-pill">
              {t.total}: {formatNumber(snapshot.totalQuantity, language)}
            </span>
            <span className="dns-pill">
              {t.generatedAt}:{' '}
              {new Date(snapshot.generatedAt).toLocaleString(
                language === 'de' ? 'de-DE' : 'it-IT',
              )}
            </span>
          </div>
        </section>

        {snapshot.category === 'wristband' && (
          <section className="dns-card mt-5 p-5 md:p-6 print-flat">
            <div className="dns-section-title">{t.legend}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 print-legend">
              {snapshot.items.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-md border border-dns-mid/15 bg-white print-legend-item"
                >
                  <div
                    className="flex h-10 items-center justify-center px-2 text-[10px] font-bold uppercase tracking-[.04em]"
                    style={{
                      backgroundColor: item.displayColorHex ?? '#FFFFFF',
                      color: item.displayTextColorHex ?? '#111111',
                      boxShadow:
                        item.displayColorHex?.toUpperCase() === '#FFFFFF'
                          ? 'inset 0 0 0 1px rgba(13,77,94,.18)'
                          : undefined,
                    }}
                  >
                    {language === 'de' ? item.label.de : item.label.it}
                  </div>
                  <div className="px-2 py-2 text-center font-alt text-[9px] text-dns-muted">
                    {t.supplierRef}: {item.supplierColorReference ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {numbering && (
          <section className="dns-card mt-5 overflow-hidden print-flat">
            <div className="flex flex-col gap-3 border-b border-dns-mid/10 p-5 md:flex-row md:items-end md:justify-between md:p-6">
              <div>
                <div className="dns-section-title">{t.numbering}</div>
                <div className="mt-2 font-alt text-[10px] text-dns-muted">
                  {t.startNumber}: <strong className="text-dns-deep">{formatTicketNumber(numbering.startNumber)}</strong>
                </div>
              </div>
              <div className="dns-pill">
                {t.nextNumber}: {formatTicketNumber(numbering.nextNumber)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-dns-mid/15 bg-dns-bg text-left text-[9px] uppercase tracking-[.05em] text-dns-mid">
                    <th className="px-4 py-3">{t.ticketType}</th>
                    <th className="px-4 py-3">{t.organization}</th>
                    <th className="px-4 py-3 text-right">{t.quantity}</th>
                    <th className="px-4 py-3 text-right">{t.from}</th>
                    <th className="px-4 py-3 text-right">{t.to}</th>
                  </tr>
                </thead>
                <tbody>
                  {numbering.rows.map((row) => (
                    <tr key={`${row.itemId}::${row.organizationId}`} className="border-b border-dns-mid/10">
                      <td className="px-4 py-2.5 text-[11px] font-semibold">{row.itemLabel[language]}</td>
                      <td className="px-4 py-2.5 text-[11px]">{row.organizationLabel}</td>
                      <td className="px-4 py-2.5 text-right font-alt text-[11px]">{formatNumber(row.quantity, language)}</td>
                      <td className="px-4 py-2.5 text-right font-alt text-[11px] tabular-nums">{formatTicketNumber(row.from)}</td>
                      <td className="px-4 py-2.5 text-right font-alt text-[11px] tabular-nums">{formatTicketNumber(row.to)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-dns-deep text-white">
                    <th colSpan={2} className="px-4 py-3 text-left text-[10px] uppercase tracking-[.06em]">{t.total}</th>
                    <th className="px-4 py-3 text-right text-[11px]">{formatNumber(numbering.totalQuantity, language)}</th>
                    <th colSpan={2} className="px-4 py-3 text-right text-[10px]">
                      {t.nextNumber}: {formatTicketNumber(numbering.nextNumber)}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        <section className="dns-card mt-5 overflow-hidden print-flat">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse dns-print-table">
              <thead>
                <tr className="border-b border-dns-mid/15 bg-dns-bg text-left text-[9px] uppercase tracking-[.05em] text-dns-mid">
                  <th className="min-w-[210px] px-4 py-3">{t.organization}</th>
                  {snapshot.items.map((item) => (
                    <th key={item.id} className="min-w-[110px] px-3 py-3 text-center">
                      {snapshot.category === 'wristband' && (
                        <span
                          className="mx-auto mb-2 block h-2 w-12 rounded-full border border-black/10"
                          style={{
                            backgroundColor: item.displayColorHex ?? '#FFFFFF',
                          }}
                        />
                      )}
                      {language === 'de' ? item.label.de : item.label.it}
                      {snapshot.category === 'pocketfolder' && item.pocketfolder && (
                        <span className="mt-1 block font-alt text-[8px] normal-case tracking-normal text-dns-muted">
                          {item.pocketfolder.backLanguageOrder}
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">{t.total}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.organizations.map((organization) => (
                  <tr
                    key={organization.organizationId}
                    className="border-b border-dns-mid/10"
                  >
                    <td className="px-4 py-2.5 text-[11px] font-semibold">
                      <div className="dns-entity-label"><RegionLogos entityType="organization" entityId={organization.organizationId} /><span>{organization.sourceLabel}</span></div>
                      {snapshot.category === 'pocketfolder' && organization.deliveryLocation && (
                        <div className="mt-1 max-w-[280px] font-alt text-[9px] font-normal leading-snug text-dns-muted">
                          <span className="font-semibold">{t.delivery}:</span>{' '}
                          {[organization.deliveryLocation.recipientName, organization.deliveryLocation.addressLine1, organization.deliveryLocation.postalLocality, organization.deliveryLocation.phone].filter(Boolean).join(' · ')}
                          {organization.deliveryLocation.status === 'needs-confirmation' && (
                            <span className="ml-1 font-bold text-amber-700">· {t.addressWarning}</span>
                          )}
                        </div>
                      )}
                    </td>
                    {snapshot.items.map((item) => {
                      const value =
                        quantities.get(
                          `${organization.organizationId}::${item.id}`,
                        ) ?? null;
                      return (
                        <td
                          key={item.id}
                          className="px-3 py-2.5 text-right font-alt text-[11px]"
                        >
                          {value === null
                            ? '—'
                            : formatNumber(value, language)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right text-[11px] font-bold">
                      {formatNumber(
                        rowTotals.get(organization.organizationId) ?? 0,
                        language,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-dns-mid bg-dns-deep text-white">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[.06em]">
                    {t.total}
                  </th>
                  {snapshot.items.map((item) => (
                    <th
                      key={item.id}
                      className="px-3 py-3 text-right text-[11px] font-bold"
                    >
                      {formatNumber(columnTotals.get(item.id) ?? 0, language)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[12px] font-bold">
                    {formatNumber(snapshot.totalQuantity, language)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
