import { useMemo, useState } from 'react';
import type { CanonicalRecord } from '../../types/master';
import type { TicketOrderRow, TicketOrderStatus } from '../../types/orders';

type Language = 'de' | 'it';

interface Props {
  language: Language;
  seasonId: string;
  reportingAreas: CanonicalRecord[];
  organizations: CanonicalRecord[];
  rows: TicketOrderRow[];
  canWrite: boolean;
}

const copy = {
  de: {
    title: 'Ticket-Bestellungen',
    intro: 'Operative Übersicht der Bestellungen und Billing Preparation. Bestellte Mengen sind Verteilungs-/Bestandsdaten und niemals automatisch Verkäufe.',
    newOrder: 'Neue Bestellung',
    season: 'Saison',
    area: 'Gebiet',
    organization: 'Organisation',
    status: 'Status',
    all: 'Alle',
    orderDate: 'Bestelldatum',
    orderNumber: 'Bestellnr.',
    lines: 'Positionen',
    quantity: 'Menge',
    amount: 'Billing Prep',
    source: 'Quelle',
    emptyTitle: 'Noch keine Bestellungen',
    emptyText: 'Die Tabellenstruktur ist bereit. Firestore-Lese-/Schreibzugriff für Bestellungen wird im nächsten kontrollierten Schritt freigeschaltet.',
    noWrite: 'Nur Lesen',
    orderedVsSold: 'Bestellt ≠ verkauft',
  },
  it: {
    title: 'Ordini biglietti',
    intro: 'Vista operativa degli ordini e della preparazione billing. Le quantità ordinate rappresentano distribuzione/disponibilità e non sono mai automaticamente vendite.',
    newOrder: 'Nuovo ordine',
    season: 'Stagione',
    area: 'Area',
    organization: 'Organizzazione',
    status: 'Stato',
    all: 'Tutti',
    orderDate: 'Data ordine',
    orderNumber: 'N. ordine',
    lines: 'Righe',
    quantity: 'Quantità',
    amount: 'Billing Prep',
    source: 'Fonte',
    emptyTitle: 'Nessun ordine',
    emptyText: 'La struttura della tabella è pronta. L’accesso Firestore in lettura/scrittura per gli ordini verrà aperto nel prossimo step controllato.',
    noWrite: 'Sola lettura',
    orderedVsSold: 'Ordinato ≠ venduto',
  },
} as const;

const statusLabels: Record<TicketOrderStatus, { de: string; it: string }> = {
  draft: { de: 'Entwurf', it: 'Bozza' },
  submitted: { de: 'Übermittelt', it: 'Inviato' },
  confirmed: { de: 'Bestätigt', it: 'Confermato' },
  fulfilled: { de: 'Erfüllt', it: 'Evaso' },
  cancelled: { de: 'Storniert', it: 'Annullato' },
};

export function TicketOrdersTable({
  language,
  seasonId,
  reportingAreas,
  organizations,
  rows,
  canWrite,
}: Props) {
  const t = copy[language];
  const [areaFilter, setAreaFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const orgById = useMemo(
    () => Object.fromEntries(organizations.map((item) => [item.id, item])),
    [organizations],
  );
  const areaById = useMemo(
    () => Object.fromEntries(reportingAreas.map((item) => [item.id, item])),
    [reportingAreas],
  );

  const filtered = rows.filter((row) =>
    (!areaFilter || row.reportingAreaId === areaFilter) &&
    (!organizationFilter || row.organizationId === organizationFilter) &&
    (!statusFilter || row.status === statusFilter),
  );

  const totalQuantity = filtered.reduce((sum, row) => sum + row.totalQuantity, 0);
  const totalAmount = filtered.reduce((sum, row) => sum + row.calculatedAmount, 0);

  return (
    <div className="space-y-5">
      <section className="dns-card p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="dns-kicker">WS {seasonId}</div>
            <h2 className="mt-1 text-[24px] font-semibold">{t.title}</h2>
            <p className="mt-2 max-w-4xl font-alt text-[12px] leading-relaxed text-dns-muted">
              {t.intro}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="dns-pill">{t.orderedVsSold}</span>
            {!canWrite && <span className="dns-pill">{t.noWrite}</span>}
            {canWrite && (
              <button
                type="button"
                disabled
                className="rounded-md bg-dns-deep px-4 py-2 text-[10px] font-bold uppercase tracking-[.05em] text-white opacity-40"
                title={t.emptyText}
              >
                {t.newOrder}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="dns-card p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span className="dns-kicker">{t.area}</span>
            <select
              value={areaFilter}
              onChange={(event) => setAreaFilter(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-[11px]"
            >
              <option value="">{t.all}</option>
              {reportingAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {String(area.canonicalName ?? area.id)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="dns-kicker">{t.organization}</span>
            <select
              value={organizationFilter}
              onChange={(event) => setOrganizationFilter(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-[11px]"
            >
              <option value="">{t.all}</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {String(org.canonicalName ?? org.id)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="dns-kicker">{t.status}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-[11px]"
            >
              <option value="">{t.all}</option>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label[language]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="dns-card border-t-[3px] border-t-dns-light p-5">
          <div className="dns-kicker">{t.quantity}</div>
          <div className="mt-2 text-[28px] font-bold">{totalQuantity.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT')}</div>
        </div>
        <div className="dns-card border-t-[3px] border-t-dns-light p-5">
          <div className="dns-kicker">{t.amount}</div>
          <div className="mt-2 text-[28px] font-bold">
            {totalAmount.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </section>

      <section className="dns-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="border-b border-dns-mid/15 text-left text-[9px] uppercase tracking-[.06em] text-dns-mid">
                <th className="px-4 py-3">{t.orderDate}</th>
                <th className="px-4 py-3">{t.orderNumber}</th>
                <th className="px-4 py-3">{t.organization}</th>
                <th className="px-4 py-3">{t.area}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 text-right">{t.lines}</th>
                <th className="px-4 py-3 text-right">{t.quantity}</th>
                <th className="px-4 py-3 text-right">{t.amount}</th>
                <th className="px-4 py-3">{t.source}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-dns-mid/10 last:border-0">
                  <td className="px-4 py-3 font-alt text-[11px]">{row.orderDate}</td>
                  <td className="px-4 py-3 text-[11px] font-semibold">{row.orderNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-[11px]">{String(orgById[row.organizationId]?.canonicalName ?? row.organizationId)}</td>
                  <td className="px-4 py-3 font-alt text-[11px] text-dns-muted">{String(areaById[row.reportingAreaId]?.canonicalName ?? row.reportingAreaId)}</td>
                  <td className="px-4 py-3"><span className="dns-pill">{statusLabels[row.status][language]}</span></td>
                  <td className="px-4 py-3 text-right font-alt text-[11px]">{row.lineCount}</td>
                  <td className="px-4 py-3 text-right font-alt text-[11px]">{row.totalQuantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-alt text-[11px]">{row.calculatedAmount.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT', { style: 'currency', currency: 'EUR' })}</td>
                  <td className="px-4 py-3 font-alt text-[10px] text-dns-muted">{row.sourceSystem ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="border-t border-dns-mid/10 px-5 py-10 text-center">
            <div className="dns-section-title">{t.emptyTitle}</div>
            <p className="mx-auto mt-2 max-w-2xl font-alt text-[11px] leading-relaxed text-dns-muted">{t.emptyText}</p>
          </div>
        )}
      </section>
    </div>
  );
}
