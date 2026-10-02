import { RegionLogos } from '../../components/RegionLogos';
import type {
  OrderMatrixCategory,
  OrderMatrixDraft,
  OrderStatus,
} from '../../types/orderMatrix';

type Language = 'de' | 'it';

const copy = {
  de: {
    title: 'Meine Bestellungen',
    intro:
      'Nur der eigene Zuständigkeitsbereich ist sichtbar. Mengen werden je Organisation gespeichert und anschließend gemeinsam an DNS übermittelt.',
    wristband: 'Armbänder',
    ticket: 'Wochen- & Saisonkarten',
    pocketfolder: 'Pocketfolder',
    draft: 'Entwurf',
    submitted: 'Eingereicht',
    confirmed: 'Bestätigt',
    fulfilled: 'Abgeschlossen',
    cancelled: 'Storniert',
    total: 'Gesamt',
    ownEdition: 'Eigene Gebietsausgabe',
    delivery: 'Lieferadresse',
    deliveryWarning: 'Lieferadresse vor Versand bestätigen',
    saveDraft: 'Entwurf speichern',
    submit: 'Bestellung absenden',
    saving: 'Speichert…',
    dirty: 'Nicht gespeicherte Änderungen',
    allSubmitted: 'Bestellung an DNS übermittelt',
    lockedAfterSubmit: 'Nach dem Absenden gesperrt',
    submitInfo:
      'Beim Absenden werden die Mengen jeder Organisation einzeln gespeichert. DNS erhält daraus automatisch die Gesamtmatrix.',
  },
  it: {
    title: 'I miei ordini',
    intro:
      'È visibile solo il proprio ambito. Le quantità vengono salvate per singola organizzazione e poi inviate insieme a DNS.',
    wristband: 'Braccialetti',
    ticket: 'Settimanali & stagionali',
    pocketfolder: 'Pocketfolder',
    draft: 'Bozza',
    submitted: 'Inviato',
    confirmed: 'Confermato',
    fulfilled: 'Concluso',
    cancelled: 'Annullato',
    total: 'Totale',
    ownEdition: 'Edizione della propria area',
    delivery: 'Indirizzo consegna',
    deliveryWarning: 'Confermare indirizzo prima della spedizione',
    saveDraft: 'Salva bozza',
    submit: 'Invia ordine',
    saving: 'Salvataggio…',
    dirty: 'Modifiche non salvate',
    allSubmitted: 'Ordine inviato a DNS',
    lockedAfterSubmit: 'Bloccato dopo l’invio',
    submitInfo:
      'Con l’invio le quantità restano registrate per singola organizzazione. DNS ottiene automaticamente la matrice complessiva.',
  },
} as const;

function formatNumber(value: number, language: Language) {
  return value.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT');
}

function statusLabel(status: OrderStatus, language: Language) {
  const t = copy[language];
  return t[status];
}

export function AreaOrderForm({
  language,
  seasonId,
  category,
  draft,
  quantities,
  rowTotals,
  statuses,
  canWrite,
  writableOrganizationIds,
  dirty,
  saving,
  onCategoryChange,
  onQuantityChange,
  onSaveDraft,
  onSubmit,
}: {
  language: Language;
  seasonId: string;
  category: OrderMatrixCategory;
  draft: OrderMatrixDraft;
  quantities: Map<string, number | null>;
  rowTotals: Map<string, number>;
  statuses: Record<string, OrderStatus>;
  canWrite: boolean;
  writableOrganizationIds: Set<string>;
  dirty: boolean;
  saving: boolean;
  onCategoryChange: (category: OrderMatrixCategory) => void;
  onQuantityChange: (organizationId: string, itemId: string, quantity: number | null) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  const t = copy[language];
  const writableOrganizations = draft.organizations.filter((organization) =>
    writableOrganizationIds.has(organization.organizationId),
  );
  const editableOrganizations = writableOrganizations.filter(
    (organization) => (statuses[organization.organizationId] ?? 'draft') === 'draft',
  );
  const allSubmitted =
    writableOrganizations.length > 0 &&
    writableOrganizations.every((organization) => {
      const status = statuses[organization.organizationId] ?? 'draft';
      return status === 'submitted' || status === 'confirmed' || status === 'fulfilled';
    });

  return (
    <div className="space-y-5">
      <section className="dns-card overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="dns-kicker">WS {seasonId}</div>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[24px] font-semibold text-dns-deep">{t.title}</h2>
              <p className="mt-2 max-w-4xl font-alt text-[11px] leading-relaxed text-dns-muted">
                {t.intro}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {allSubmitted && !dirty && <span className="dns-pill">{t.allSubmitted}</span>}
              {dirty && <span className="dns-pill">{t.dirty}</span>}
            </div>
          </div>
        </div>
        <div className="bg-dns-mid">
          <div className="flex min-w-max">
            {([
              ['wristband', t.wristband],
              ['ticket', t.ticket],
              ['pocketfolder', t.pocketfolder],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onCategoryChange(id)}
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

      {draft.organizations.map((organization) => {
        const status = statuses[organization.organizationId] ?? 'draft';
        const writable = writableOrganizationIds.has(organization.organizationId);
        const locked = status !== 'draft';
        return (
          <section key={organization.organizationId} className="dns-card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <RegionLogos entityType="organization" entityId={organization.organizationId} />
                <div>
                  <h3 className="text-[17px] font-semibold text-dns-deep">{organization.sourceLabel}</h3>
                  {category === 'pocketfolder' && organization.deliveryLocation && (
                    <div className="mt-1 max-w-[720px] font-alt text-[10px] leading-relaxed text-dns-muted">
                      <span className="font-semibold">{t.delivery}:</span>{' '}
                      {[
                        organization.deliveryLocation.recipientName,
                        organization.deliveryLocation.addressLine1,
                        organization.deliveryLocation.postalLocality,
                        organization.deliveryLocation.phone,
                      ].filter(Boolean).join(' · ')}
                      {organization.deliveryLocation.status === 'needs-confirmation' && (
                        <span className="ml-1 font-bold text-amber-700">· {t.deliveryWarning}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="dns-pill">{statusLabel(status, language)}</span>
                {!writable && <span className="dns-pill">{language === 'de' ? 'Nur Lesen' : 'Sola lettura'}</span>}
                {writable && locked && <span className="dns-pill">{t.lockedAfterSubmit}</span>}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {draft.items.map((item) => {
                const key = `${organization.organizationId}::${item.id}`;
                const value = quantities.get(key) ?? null;
                const ownEdition =
                  category === 'pocketfolder' &&
                  item.pocketfolder?.reportingAreaId === organization.reportingAreaId;

                return (
                  <label
                    key={item.id}
                    className={[
                      'rounded-lg border bg-white p-4',
                      ownEdition ? 'border-dns-mid/45' : 'border-dns-mid/15',
                    ].join(' ')}
                  >
                    <div className="flex min-h-10 items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold text-dns-deep">
                          {item.label[language]}
                        </div>
                        {category === 'pocketfolder' && item.pocketfolder && (
                          <div className="mt-1 font-alt text-[9px] text-dns-muted">
                            {item.pocketfolder.backLanguageOrder}
                          </div>
                        )}
                        {ownEdition && (
                          <div className="mt-1 font-alt text-[8px] font-bold uppercase tracking-[.04em] text-dns-mid">
                            {t.ownEdition}
                          </div>
                        )}
                      </div>
                      {category === 'wristband' && (
                        <span
                          className="block h-4 w-10 rounded-full border border-black/10"
                          style={{ backgroundColor: item.displayColorHex ?? '#FFFFFF' }}
                        />
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={!canWrite || !writable || locked || saving}
                      value={value ?? ''}
                      onChange={(event) =>
                        onQuantityChange(
                          organization.organizationId,
                          item.id,
                          event.target.value === ''
                            ? null
                            : Math.max(0, Math.trunc(Number(event.target.value))),
                        )
                      }
                      className="dns-input mt-3 text-right font-alt text-[13px]"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end border-t border-dns-mid/10 pt-4">
              <div className="text-right">
                <div className="dns-kicker">{t.total}</div>
                <div className="mt-1 text-[22px] font-bold text-dns-deep">
                  {formatNumber(rowTotals.get(organization.organizationId) ?? 0, language)}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="dns-card p-5 md:p-6">
        <p className="max-w-4xl font-alt text-[10px] leading-relaxed text-dns-muted">
          {t.submitInfo}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={!canWrite || saving || !dirty || editableOrganizations.length === 0}
            className="dns-button disabled:opacity-40" data-variant="secondary"
          >
            {saving ? t.saving : t.saveDraft}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canWrite || saving || editableOrganizations.length === 0}
            className="dns-button disabled:opacity-40" data-variant="primary"
          >
            {saving ? t.saving : t.submit}
          </button>
        </div>
      </section>
    </div>
  );
}
