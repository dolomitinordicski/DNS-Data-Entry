import { useMemo, useState } from 'react';
import {
  cloneOrderDraft,
  ticketOrderDraft2026,
  wristbandOrderDraft2026,
} from '../../config/orders2026';
import type {
  OrderMatrixCategory,
  OrderMatrixDraft,
} from '../../types/orderMatrix';

type Language = 'de' | 'it';

interface Props {
  language: Language;
  seasonId: string;
  canWrite: boolean;
}

const copy = {
  de: {
    title: 'Ticket-Bestellungen',
    intro:
      'Saisonale Bestellmatrix nach dem bisherigen DNS-Workflow: Organisationen in den Zeilen, bestellbare Artikel in den Spalten.',
    wristbands: 'Armbänder',
    tickets: 'Wochen- & Saisonkarten',
    source: 'Quelle: ALL TICKETS 2026-27.xlsx',
    browserDraft: 'Browser-Entwurf · noch nicht in Firestore gespeichert',
    readOnly: 'Nur Lesen',
    total: 'Gesamt',
    sourceTotal: 'Drive-Stand',
    blankInfo: 'Leere Zellen aus der Quelldatei bleiben leer; 0 bleibt eine explizite Null.',
    reset: 'Auf Drive-Stand zurücksetzen',
    orderedVsSold: 'Bestellt ≠ verkauft',
    organization: 'Organisation',
  },
  it: {
    title: 'Ordini biglietti',
    intro:
      'Matrice ordini stagionale secondo il precedente workflow DNS: organizzazioni sulle righe, articoli ordinabili sulle colonne.',
    wristbands: 'Braccialetti',
    tickets: 'Settimanali & stagionali',
    source: 'Fonte: ALL TICKETS 2026-27.xlsx',
    browserDraft: 'Bozza nel browser · non ancora salvata in Firestore',
    readOnly: 'Sola lettura',
    total: 'Totale',
    sourceTotal: 'Valore Drive',
    blankInfo: 'Le celle vuote del file sorgente restano vuote; 0 resta uno zero esplicito.',
    reset: 'Ripristina valori Drive',
    orderedVsSold: 'Ordinato ≠ venduto',
    organization: 'Organizzazione',
  },
} as const;

const SOURCE_TOTALS: Record<OrderMatrixCategory, number> = {
  wristband: 55700,
  ticket: 24415,
};

function storageKey(category: OrderMatrixCategory) {
  return `dns-order-draft-2026-27-${category}`;
}

function loadDraft(category: OrderMatrixCategory): OrderMatrixDraft {
  const source =
    category === 'wristband' ? wristbandOrderDraft2026 : ticketOrderDraft2026;

  try {
    const stored = sessionStorage.getItem(storageKey(category));
    if (stored) return JSON.parse(stored) as OrderMatrixDraft;
  } catch (error) {
    console.warn('Order draft session restore failed', error);
  }

  return cloneOrderDraft(source);
}

function formatNumber(value: number, language: Language) {
  return value.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT');
}

export function TicketOrdersTable({ language, seasonId, canWrite }: Props) {
  const t = copy[language];
  const [category, setCategory] = useState<OrderMatrixCategory>('wristband');
  const [wristbandDraft, setWristbandDraft] = useState(() => loadDraft('wristband'));
  const [ticketDraft, setTicketDraft] = useState(() => loadDraft('ticket'));

  const draft = category === 'wristband' ? wristbandDraft : ticketDraft;
  const setDraft = category === 'wristband' ? setWristbandDraft : setTicketDraft;

  const quantities = useMemo(
    () =>
      new Map(
        draft.cells.map((cell) => [
          `${cell.organizationId}::${cell.itemId}`,
          cell.quantity,
        ]),
      ),
    [draft.cells],
  );

  const rowTotals = useMemo(
    () =>
      new Map(
        draft.organizations.map((organization) => [
          organization.organizationId,
          draft.items.reduce(
            (sum, item) =>
              sum +
              (quantities.get(`${organization.organizationId}::${item.id}`) ?? 0),
            0,
          ),
        ]),
      ),
    [draft, quantities],
  );

  const columnTotals = useMemo(
    () =>
      new Map(
        draft.items.map((item) => [
          item.id,
          draft.organizations.reduce(
            (sum, organization) =>
              sum +
              (quantities.get(`${organization.organizationId}::${item.id}`) ?? 0),
            0,
          ),
        ]),
      ),
    [draft, quantities],
  );

  const grandTotal = [...rowTotals.values()].reduce((sum, value) => sum + value, 0);

  function updateQuantity(
    organizationId: string,
    itemId: string,
    quantity: number | null,
  ) {
    if (!canWrite) return;

    const next: OrderMatrixDraft = {
      ...draft,
      cells: draft.cells.map((cell) =>
        cell.organizationId === organizationId && cell.itemId === itemId
          ? { ...cell, quantity }
          : cell,
      ),
    };

    setDraft(next);
    sessionStorage.setItem(storageKey(category), JSON.stringify(next));
  }

  function resetToSource() {
    if (!canWrite) return;
    const source =
      category === 'wristband' ? wristbandOrderDraft2026 : ticketOrderDraft2026;
    const next = cloneOrderDraft(source);
    setDraft(next);
    sessionStorage.removeItem(storageKey(category));
  }

  return (
    <div className="space-y-5">
      <section className="dns-card overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="dns-kicker">WS {seasonId}</div>
              <h2 className="mt-1 text-[24px] font-semibold">{t.title}</h2>
              <p className="mt-2 max-w-4xl font-alt text-[12px] leading-relaxed text-dns-muted">
                {t.intro}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="dns-pill">{t.orderedVsSold}</span>
              {!canWrite && <span className="dns-pill">{t.readOnly}</span>}
            </div>
          </div>
        </div>

        <div className="bg-dns-mid">
          <div className="flex min-w-max">
            {([
              ['wristband', t.wristbands],
              ['ticket', t.tickets],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={[
                  'border-0 border-b-[3px] bg-transparent px-5 py-3 text-[11px] font-semibold uppercase tracking-[.06em] transition',
                  category === id
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white/85',
                ].join(' ')}
                aria-current={category === id ? 'page' : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="dns-card p-4 md:p-5">
          <div className="dns-kicker">{t.total}</div>
          <div className="mt-2 text-[27px] font-bold text-dns-deep">
            {formatNumber(grandTotal, language)}
          </div>
        </div>
        <div className="dns-card p-4 md:p-5">
          <div className="dns-kicker">{t.sourceTotal}</div>
          <div className="mt-2 text-[27px] font-bold text-dns-deep">
            {formatNumber(SOURCE_TOTALS[category], language)}
          </div>
        </div>
        <div className="dns-card p-4 md:p-5">
          <div className="dns-kicker">{t.source}</div>
          <div className="mt-2 font-alt text-[11px] leading-relaxed text-dns-muted">
            {t.browserDraft}
          </div>
        </div>
      </section>

      <section className="dns-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-dns-mid/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="font-alt text-[10px] leading-relaxed text-dns-muted">
            {t.blankInfo}
          </p>
          {canWrite && (
            <button
              type="button"
              onClick={resetToSource}
              className="self-start border-0 border-b border-dns-mid/40 bg-transparent px-0 py-1 text-[10px] font-bold uppercase tracking-[.05em] text-dns-mid hover:border-dns-deep hover:text-dns-deep md:self-auto"
            >
              {t.reset}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr className="border-b border-dns-mid/15 bg-dns-bg text-left text-[9px] uppercase tracking-[.05em] text-dns-mid">
                <th className="sticky left-0 z-10 min-w-[220px] bg-dns-bg px-4 py-3">
                  {t.organization}
                </th>
                {draft.items.map((item) => (
                  <th key={item.id} className="min-w-[118px] px-3 py-3 text-center">
                    <span className="block whitespace-normal leading-tight">
                      {item.label[language]}
                    </span>
                  </th>
                ))}
                <th className="min-w-[110px] px-4 py-3 text-right">{t.total}</th>
              </tr>
            </thead>
            <tbody>
              {draft.organizations.map((organization, rowIndex) => (
                <tr
                  key={organization.organizationId}
                  className={[
                    'border-b border-dns-mid/10 last:border-b-0',
                    rowIndex % 2 ? 'bg-dns-bg/45' : 'bg-white',
                  ].join(' ')}
                >
                  <td
                    className={[
                      'sticky left-0 z-[5] px-4 py-2.5 text-[11px] font-semibold text-dns-deep',
                      rowIndex % 2 ? 'bg-[#f7fafb]' : 'bg-white',
                    ].join(' ')}
                  >
                    {organization.sourceLabel}
                  </td>
                  {draft.items.map((item) => {
                    const key = `${organization.organizationId}::${item.id}`;
                    const value = quantities.get(key) ?? null;

                    return (
                      <td key={item.id} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          disabled={!canWrite}
                          value={value ?? ''}
                          onChange={(event) =>
                            updateQuantity(
                              organization.organizationId,
                              item.id,
                              event.target.value === ''
                                ? null
                                : Math.max(0, Math.trunc(Number(event.target.value))),
                            )
                          }
                          className="w-[92px] rounded-md border border-dns-mid/15 bg-white px-2 py-1.5 text-right font-alt text-[11px] text-dns-deep outline-none focus:border-dns-mid disabled:bg-transparent disabled:text-dns-muted"
                          aria-label={`${organization.sourceLabel} · ${item.label[language]}`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right text-[11px] font-bold text-dns-deep">
                    {formatNumber(rowTotals.get(organization.organizationId) ?? 0, language)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-dns-mid bg-dns-deep text-white">
                <th className="sticky left-0 z-10 bg-dns-deep px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[.06em]">
                  {t.total}
                </th>
                {draft.items.map((item) => (
                  <th key={item.id} className="px-3 py-3 text-center text-[11px] font-bold">
                    {formatNumber(columnTotals.get(item.id) ?? 0, language)}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[12px] font-bold">
                  {formatNumber(grandTotal, language)}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
