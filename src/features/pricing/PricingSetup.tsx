import { RegionLogos } from '../../components/RegionLogos';
import { useMemo, useState } from 'react';
import { channelLabels, periodLabels, productLabels } from '../../config/pricing';
import type { CanonicalRecord } from '../../types/master';
import type { PricingDraftRow } from '../../types/pricing';

type Language = 'de' | 'it';

interface Props {
  language: Language;
  seasonId: string;
  reportingAreas: CanonicalRecord[];
  organizations: CanonicalRecord[];
  rows: PricingDraftRow[];
  onChange: (rows: PricingDraftRow[]) => void;
  readOnly?: boolean;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  saveStatus: string;
}

const text = {
  de: {
    title: 'Tarifkonfiguration',
    intro: 'Einmalige Saisonkonfiguration. DNS-Tarife gelten netzweit; Gebietstarife können je Gebiet gepflegt werden. Organisations-Overrides bleiben für echte Ausnahmen reserviert.',
    network: 'DNS-Tarife',
    area: 'Gebietstarife',
    override: 'Organisations-Overrides',
    price: 'Preis',
    settlement: 'Abrechnungswert',
    period: 'Periode',
    channel: 'Kanal',
    product: 'Produkt',
    areaLabel: 'Gebiet',
    noWrite: 'Tarife · explizit in Firebase speichern',
    inherited: 'Nur für bestätigte Ausnahmen. Priorität: Organisation → Gebiet → DNS.',
    selectOrg: 'Organisation wählen',
    selectProduct: 'Produkt wählen',
    addOverride: 'Override hinzufügen',
    empty: 'Noch keine Organisations-Overrides im Entwurf.',
  },
  it: {
    title: 'Configurazione tariffe',
    intro: 'Configurazione una tantum per stagione. Le tariffe DNS valgono a livello rete; le tariffe di area possono essere definite per ciascuna area. Gli override per organizzazione restano riservati alle vere eccezioni.',
    network: 'Tariffe DNS',
    area: 'Tariffe area',
    override: 'Override organizzazione',
    price: 'Prezzo',
    settlement: 'Valore contabile',
    period: 'Periodo',
    channel: 'Canale',
    product: 'Prodotto',
    areaLabel: 'Area',
    noWrite: 'Tariffe · salvataggio esplicito in Firebase',
    inherited: 'Solo per eccezioni confermate. Priorità: organizzazione → area → DNS.',
    selectOrg: 'Seleziona organizzazione',
    selectProduct: 'Seleziona prodotto',
    addOverride: 'Aggiungi override',
    empty: 'Nessun override organizzazione nella bozza.',
  },
} as const;

function PriceInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-alt text-[11px] text-dns-muted">€</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value === '' ? null : Number(event.target.value))
        }
        className="w-[96px] rounded-md border border-dns-mid/20 bg-white py-1.5 pl-6 pr-2 text-right font-alt text-[11px] text-dns-deep outline-none focus:border-dns-mid disabled:bg-dns-bg disabled:text-dns-muted"
      />
    </div>
  );
}

export function PricingSetup({ language, seasonId, reportingAreas, organizations, rows, onChange, readOnly = false, onSave, saving, canSave, saveStatus }: Props) {
  const t = text[language];
  const [selectedArea, setSelectedArea] = useState(reportingAreas[0]?.id ?? '');
  const [overrideOrg, setOverrideOrg] = useState('');
  const [overrideProduct, setOverrideProduct] = useState('');

  const networkRows = rows.filter((row) => row.scopeType === 'network');
  const areaRows = rows.filter(
    (row) => row.scopeType === 'reportingArea' && row.scopeId === selectedArea,
  );
  const overrideRows = rows.filter((row) => row.scopeType === 'organization');

  const areaById = useMemo(
    () => Object.fromEntries(reportingAreas.map((area) => [area.id, area])),
    [reportingAreas],
  );

  function patch(id: string, values: Partial<PricingDraftRow>) {
    if (readOnly) return;
    onChange(rows.map((row) => (row.id === id ? { ...row, ...values } : row)));
  }

  function addOverride() {
    if (readOnly) return;
    if (!overrideOrg || !overrideProduct) return;
    const id = `${seasonId}-${overrideOrg}-${overrideProduct}-official-regular`;
    if (rows.some((row) => row.id === id)) return;
    onChange([
      ...rows,
      {
        id,
        seasonId,
        scopeType: 'organization',
        scopeId: overrideOrg,
        productCode: overrideProduct as PricingDraftRow['productCode'],
        salesChannel: 'official',
        salesPeriod: 'regular',
        unitPrice: null,
        settlementUnitPrice: null,
        validFrom: '',
        validTo: '',
        notes: '',
      },
    ]);
  }

  const renderRows = (data: PricingDraftRow[], includeArea = false) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="border-b border-dns-mid/15 text-left text-[9px] uppercase tracking-[.06em] text-dns-mid">
            {includeArea && <th className="px-3 py-2">{t.areaLabel}</th>}
            <th className="px-3 py-2">{t.product}</th>
            <th className="px-3 py-2">{t.channel}</th>
            <th className="px-3 py-2">{t.period}</th>
            <th className="px-3 py-2 text-right">{t.price}</th>
            <th className="px-3 py-2 text-right">{t.settlement}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-dns-mid/10 last:border-b-0">
              {includeArea && (
                <td className="px-3 py-2 text-[11px] font-semibold">
                  <div className="dns-entity-label"><RegionLogos entityType="reportingArea" entityId={row.scopeId} /><span>{String(areaById[row.scopeId]?.canonicalName ?? row.scopeId)}</span></div>
                </td>
              )}
              <td className="px-3 py-2 text-[11px] font-semibold">
                {productLabels[row.productCode][language]}
              </td>
              <td className="px-3 py-2 font-alt text-[11px] text-dns-muted">
                {channelLabels[row.salesChannel][language]}
              </td>
              <td className="px-3 py-2 font-alt text-[11px] text-dns-muted">
                {periodLabels[row.salesPeriod][language]}
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end">
                  <PriceInput
                    value={row.unitPrice}
                    disabled={readOnly}
                    onChange={(value) =>
                      patch(row.id, {
                        unitPrice: value,
                        settlementUnitPrice:
                          row.settlementUnitPrice === null || row.settlementUnitPrice === row.unitPrice
                            ? value
                            : row.settlementUnitPrice,
                      })
                    }
                  />
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end">
                  <PriceInput
                    value={row.settlementUnitPrice}
                    disabled={readOnly}
                    onChange={(value) => patch(row.id, { settlementUnitPrice: value })}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="dns-card p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <div className="dns-kicker">WS {seasonId}</div>
            <h2 className="mt-1 text-[24px] font-semibold">{t.title}</h2>
            <p className="mt-2 max-w-4xl font-alt text-[12px] leading-relaxed text-dns-muted">{t.intro}</p>
          </div>
          <div className="space-y-2">
            <span className="dns-pill">{t.noWrite}</span>
            <button type="button" disabled={!canSave || saving} onClick={onSave} className="block rounded-md bg-dns-deep px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-40">
              {saving ? (language === 'de' ? 'Speichern…' : 'Salvataggio…') : (language === 'de' ? 'In Firebase speichern' : 'Salva in Firebase')}
            </button>
            <p role="status" className="max-w-[320px] break-words font-alt text-[11px]">{saveStatus}</p>
          </div>
        </div>
      </section>

      <section className="dns-card overflow-hidden">
        <div className="border-b border-dns-mid/10 px-5 py-4">
          <div className="dns-section-title">{t.network}</div>
        </div>
        {renderRows(networkRows)}
      </section>

      <section className="dns-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-dns-mid/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="dns-section-title">{t.area}</div>
          <div className="flex min-w-0 items-center gap-3">
            <RegionLogos entityType="reportingArea" entityId={selectedArea} />
          <select
            aria-label={t.areaLabel}
            value={selectedArea}
            onChange={(event) => setSelectedArea(event.target.value)}
            className="rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-[11px] text-dns-deep outline-none"
          >
            {reportingAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {String(area.canonicalName ?? area.id)}
              </option>
            ))}
          </select>
          </div>
        </div>
        {renderRows(areaRows, true)}
      </section>

      <section className="dns-card p-5 md:p-6">
        <div className="dns-section-title">{t.override}</div>
        <p className="mt-2 font-alt text-[11px] text-dns-muted">{t.inherited}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            value={overrideOrg}
            disabled={readOnly}
            onChange={(event) => setOverrideOrg(event.target.value)}
            className="rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-[11px]"
          >
            <option value="">{t.selectOrg}</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {String(org.canonicalName ?? org.id)}
              </option>
            ))}
          </select>
          <select
            value={overrideProduct}
            disabled={readOnly}
            onChange={(event) => setOverrideProduct(event.target.value)}
            className="rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-[11px]"
          >
            <option value="">{t.selectProduct}</option>
            {Object.entries(productLabels).map(([code, label]) => (
              <option key={code} value={code}>
                {label[language]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addOverride}
            disabled={readOnly}
            className="rounded-md bg-dns-deep px-4 py-2 text-[10px] font-bold uppercase tracking-[.05em] text-white hover:bg-dns-mid disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.addOverride}
          </button>
        </div>

        <div className="mt-4">
          {overrideRows.length ? renderRows(overrideRows) : (
            <div className="rounded-lg border border-dashed border-dns-mid/20 bg-dns-bg p-4 font-alt text-[11px] text-dns-muted">
              {t.empty}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
