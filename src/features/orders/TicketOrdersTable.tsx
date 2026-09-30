import { useEffect, useMemo, useState } from 'react';
import {
  cloneOrderDraft,
  ticketOrderDraft2026,
  wristbandOrderDraft2026,
} from '../../config/orders2026';
import {
  loadPersistedOrderMatrix,
  savePersistedOrderMatrix,
} from '../../services/orders';
import type { DNSAccessContext } from '../../types/access';
import type { CanonicalRecord } from '../../types/master';
import type {
  OrderMatrixCategory,
  OrderMatrixDraft,
  PersistedOrderMatrix,
} from '../../types/orderMatrix';

type Language = 'de' | 'it';

interface Props {
  language: Language;
  seasonId: string;
  canWrite: boolean;
  developmentMode: boolean;
  access: DNSAccessContext | null;
  organizations: CanonicalRecord[];
}

const copy = {
  de: {
    title: 'Ticket-Bestellungen',
    intro:
      'Saisonale Bestellmatrix nach dem bisherigen DNS-Workflow: Organisationen in den Zeilen, bestellbare Artikel in den Spalten.',
    wristbands: 'Armbänder',
    tickets: 'Wochen- & Saisonkarten',
    source: 'Quelle: ALL TICKETS 2026-27.xlsx',
    localDraft: 'DEV MODE · lokaler Browser-Entwurf',
    live: 'DNS_Core · Firestore live',
    readOnly: 'Nur Lesen',
    total: 'Gesamt',
    sourceTotal: 'Import-Referenz',
    blankInfo: 'Leere Zellen bleiben ohne Datensatz; 0 wird als explizite Null gespeichert.',
    reset: 'Auf Drive-Stand zurücksetzen',
    reload: 'Neu aus Firestore laden',
    save: 'Speichern',
    saving: 'Speichert…',
    saved: 'Firestore synchronisiert',
    dirty: 'Nicht gespeicherte Änderungen',
    orderedVsSold: 'Bestellt ≠ verkauft',
    organization: 'Organisation',
    legend: 'Farb-Legende 2026/27',
    legendNote:
      'Die Farben sind saisonal fixiert und können in anderen Jahren wechseln. Die Bildschirmfarben dienen als visuelle Orientierung; die Lieferantenreferenz ist maßgeblich.',
    loading: 'Bestellungen werden aus DNS_Core geladen…',
    error: 'Bestelldaten konnten nicht geladen oder gespeichert werden.',
  },
  it: {
    title: 'Ordini biglietti',
    intro:
      'Matrice ordini stagionale secondo il precedente workflow DNS: organizzazioni sulle righe, articoli ordinabili sulle colonne.',
    wristbands: 'Braccialetti',
    tickets: 'Settimanali & stagionali',
    source: 'Fonte: ALL TICKETS 2026-27.xlsx',
    localDraft: 'DEV MODE · bozza locale nel browser',
    live: 'DNS_Core · Firestore live',
    readOnly: 'Sola lettura',
    total: 'Totale',
    sourceTotal: 'Riferimento import',
    blankInfo: 'Le celle vuote restano senza record; 0 viene salvato come zero esplicito.',
    reset: 'Ripristina valori Drive',
    reload: 'Ricarica da Firestore',
    save: 'Salva',
    saving: 'Salvataggio…',
    saved: 'Firestore sincronizzato',
    dirty: 'Modifiche non salvate',
    orderedVsSold: 'Ordinato ≠ venduto',
    organization: 'Organizzazione',
    legend: 'Legenda colori 2026/27',
    legendNote:
      'I colori sono fissati per stagione e possono cambiare negli anni successivi. I colori a schermo sono solo orientativi; fa fede il riferimento del fornitore.',
    loading: 'Caricamento ordini da DNS_Core…',
    error: 'Impossibile caricare o salvare i dati degli ordini.',
  },
} as const;

const SOURCE_TOTALS: Record<OrderMatrixCategory, number> = {
  wristband: 55700,
  ticket: 24415,
};

function storageKey(category: OrderMatrixCategory) {
  return `dns-order-draft-2026-27-${category}`;
}

function loadDevDraft(category: OrderMatrixCategory): OrderMatrixDraft {
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

function devMatrix(category: OrderMatrixCategory): PersistedOrderMatrix {
  return {
    draft: loadDevDraft(category),
    persistedOrderIds: new Set<string>(),
    persistedLineIds: new Set<string>(),
  };
}

function formatNumber(value: number, language: Language) {
  return value.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT');
}

function orgAreaIds(org: CanonicalRecord) {
  return Array.isArray(org.reportingAreaIds)
    ? org.reportingAreaIds.filter((value): value is string => typeof value === 'string')
    : [];
}

function getVisibleOrganizationIds(
  developmentMode: boolean,
  access: DNSAccessContext | null,
  organizations: CanonicalRecord[],
) {
  const all = new Set(organizations.map((organization) => organization.id));

  if (developmentMode || access?.isAdmin) return all;
  if (!access?.profile?.active) return new Set<string>();

  const visible = new Set<string>();

  for (const grant of access.grants) {
    if (!grant.active || !grant.permissions.includes('ticketOrders.read')) continue;

    if (grant.scopeType === 'network') return all;

    if (grant.scopeType === 'organization') {
      visible.add(grant.scopeId);
      continue;
    }

    if (grant.scopeType === 'reportingArea') {
      organizations
        .filter((organization) => orgAreaIds(organization).includes(grant.scopeId))
        .forEach((organization) => visible.add(organization.id));
    }
  }

  return visible;
}

export function TicketOrdersTable({
  language,
  seasonId,
  canWrite,
  developmentMode,
  access,
  organizations,
}: Props) {
  const t = copy[language];
  const [category, setCategory] = useState<OrderMatrixCategory>('wristband');
  const [matrices, setMatrices] = useState<
    Partial<Record<OrderMatrixCategory, PersistedOrderMatrix>>
  >({});
  const [dirty, setDirty] = useState<Record<OrderMatrixCategory, boolean>>({
    wristband: false,
    ticket: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const visibleOrganizationIds = useMemo(
    () => getVisibleOrganizationIds(developmentMode, access, organizations),
    [developmentMode, access, organizations],
  );

  const organizationAreaById = useMemo(
    () =>
      Object.fromEntries(
        organizations.map((organization) => [
          organization.id,
          orgAreaIds(organization)[0],
        ]),
      ) as Record<string, string | undefined>,
    [organizations],
  );

  async function loadAll() {
    setLoading(true);
    setError(false);

    try {
      if (developmentMode) {
        setMatrices({
          wristband: devMatrix('wristband'),
          ticket: devMatrix('ticket'),
        });
        setDirty({ wristband: false, ticket: false });
        return;
      }

      const [wristband, ticket] = await Promise.all([
        loadPersistedOrderMatrix({
          seasonId,
          category: 'wristband',
          visibleOrganizationIds,
          organizationAreaById,
        }),
        loadPersistedOrderMatrix({
          seasonId,
          category: 'ticket',
          visibleOrganizationIds,
          organizationAreaById,
        }),
      ]);

      setMatrices({ wristband, ticket });
      setDirty({ wristband: false, ticket: false });
    } catch (reason) {
      console.error('Order matrix load failed', reason);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [seasonId, developmentMode, access]);

  const current = matrices[category];
  const draft = current?.draft;

  const quantities = useMemo(
    () =>
      new Map(
        (draft?.cells ?? []).map((cell) => [
          `${cell.organizationId}::${cell.itemId}`,
          cell.quantity,
        ]),
      ),
    [draft?.cells],
  );

  const rowTotals = useMemo(
    () =>
      new Map(
        (draft?.organizations ?? []).map((organization) => [
          organization.organizationId,
          (draft?.items ?? []).reduce(
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
        (draft?.items ?? []).map((item) => [
          item.id,
          (draft?.organizations ?? []).reduce(
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
    if (!canWrite || !current) return;

    const nextDraft: OrderMatrixDraft = {
      ...current.draft,
      cells: current.draft.cells.map((cell) =>
        cell.organizationId === organizationId && cell.itemId === itemId
          ? { ...cell, quantity }
          : cell,
      ),
    };

    setMatrices((state) => ({
      ...state,
      [category]: { ...current, draft: nextDraft },
    }));
    setDirty((state) => ({ ...state, [category]: true }));

    if (developmentMode) {
      sessionStorage.setItem(storageKey(category), JSON.stringify(nextDraft));
    }
  }

  async function saveCurrent() {
    if (!current || !canWrite || developmentMode || !dirty[category]) return;

    setSaving(true);
    setError(false);
    try {
      await savePersistedOrderMatrix({
        draft: current.draft,
        persistedOrderIds: current.persistedOrderIds,
        persistedLineIds: current.persistedLineIds,
      });
      await loadAll();
    } catch (reason) {
      console.error('Order matrix save failed', reason);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function resetDevToSource() {
    if (!developmentMode || !canWrite) return;
    const source =
      category === 'wristband' ? wristbandOrderDraft2026 : ticketOrderDraft2026;
    const next = cloneOrderDraft(source);
    setMatrices((state) => ({
      ...state,
      [category]: {
        draft: next,
        persistedOrderIds: new Set<string>(),
        persistedLineIds: new Set<string>(),
      },
    }));
    setDirty((state) => ({ ...state, [category]: false }));
    sessionStorage.removeItem(storageKey(category));
  }

  if (loading && !draft) {
    return (
      <section className="dns-card p-6">
        <div className="dns-kicker">{t.loading}</div>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className="dns-card p-6">
        <div className="dns-section-title">{t.error}</div>
      </section>
    );
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
              <span className="dns-pill">
                {developmentMode ? t.localDraft : t.live}
              </span>
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

      {category === 'wristband' && (
        <section className="dns-card p-5 md:p-6">
          <div className="dns-section-title">{t.legend}</div>
          <p className="mt-2 max-w-5xl font-alt text-[10px] leading-relaxed text-dns-muted">
            {t.legendNote}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {draft.items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-md border border-dns-mid/15 bg-white">
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
                  {item.label[language]}
                </div>
                <div className="px-2 py-2 text-center font-alt text-[9px] text-dns-muted">
                  {item.supplierColorReference ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
            {developmentMode
              ? t.localDraft
              : dirty[category]
                ? t.dirty
                : t.saved}
          </div>
        </div>
      </section>

      <section className="dns-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-dns-mid/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="font-alt text-[10px] leading-relaxed text-dns-muted">
            {t.blankInfo}
          </p>
          <div className="flex flex-wrap gap-3">
            {developmentMode ? (
              canWrite && (
                <button
                  type="button"
                  onClick={resetDevToSource}
                  className="border-0 border-b border-dns-mid/40 bg-transparent px-0 py-1 text-[10px] font-bold uppercase tracking-[.05em] text-dns-mid hover:border-dns-deep hover:text-dns-deep"
                >
                  {t.reset}
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void loadAll()}
                  disabled={loading || saving}
                  className="border-0 border-b border-dns-mid/40 bg-transparent px-0 py-1 text-[10px] font-bold uppercase tracking-[.05em] text-dns-mid hover:border-dns-deep hover:text-dns-deep disabled:opacity-40"
                >
                  {t.reload}
                </button>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => void saveCurrent()}
                    disabled={!dirty[category] || saving}
                    className="rounded-md bg-dns-deep px-4 py-2 text-[10px] font-bold uppercase tracking-[.05em] text-white transition hover:bg-dns-mid disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? t.saving : t.save}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 font-alt text-[11px] text-red-800">
            {t.error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr className="border-b border-dns-mid/15 bg-dns-bg text-left text-[9px] uppercase tracking-[.05em] text-dns-mid">
                <th className="sticky left-0 z-10 min-w-[220px] bg-dns-bg px-4 py-3">
                  {t.organization}
                </th>
                {draft.items.map((item) => (
                  <th key={item.id} className="min-w-[118px] px-3 py-3 text-center">
                    {category === 'wristband' && (
                      <span
                        className="mx-auto mb-2 block h-2 w-14 rounded-full border border-black/10"
                        style={{ backgroundColor: item.displayColorHex ?? '#FFFFFF' }}
                      />
                    )}
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
                          disabled={!canWrite || saving}
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
