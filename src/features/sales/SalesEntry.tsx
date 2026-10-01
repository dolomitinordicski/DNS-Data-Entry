import { useState } from 'react';
import { RegionLogos } from '../../components/RegionLogos';
import { productLabels, channelLabels, periodLabels } from '../../config/pricing';
import type { DNSCoreMaster } from '../../types/master';
import type { DNSAccessContext } from '../../types/access';
import type { PricingDraftRow, ProductCode, SalesChannel, SalesPeriod } from '../../types/pricing';
import type { SalesDraftRow } from '../../types/sales';

const copy = {
  de: { title: 'Verkäufe erfassen', draft: 'Sitzungsentwurf · nicht in Firebase gespeichert', intro: 'Tatsächlich verkaufte Tickets je Organisation, Kanal und Periode. Bestellungen werden nicht als Verkäufe übernommen.', organization: 'Organisation', area: 'Gebiet', quantity: 'Verkaufte Tickets', price: 'Tarif', calculated: 'Berechnet', actual: 'Gemeldeter Umsatz', reason: 'Begründung der Abweichung', total: 'Umsatz · vollständige Zeilen', missing: 'Tarif fehlt', pending: 'Unvollständige Angaben', complete: 'Ausgefüllte Zeilen vollständig', empty: 'Keine Organisation für diesen Bereich freigeschaltet.', source: 'Tarife aus dem aktuellen Sitzungsentwurf', help: 'Gemeldeten Umsatz nur bei Abweichungen eintragen; eine Begründung ist dann erforderlich. Leere Menge bedeutet nicht gemeldet, 0 bedeutet keine Verkäufe.', warning: 'Entwürfe bleiben beim Tabwechsel erhalten. Beim Neuladen oder Abmelden gehen sie verloren.' },
  it: { title: 'Inserimento vendite', draft: 'Bozza di sessione · non salvata in Firebase', intro: 'Biglietti effettivamente venduti per organizzazione, canale e periodo. Gli ordini non vengono trasformati in vendite.', organization: 'Organizzazione', area: 'Area', quantity: 'Biglietti venduti', price: 'Tariffa', calculated: 'Calcolato', actual: 'Ricavo dichiarato', reason: 'Motivo della rettifica', total: 'Ricavi · righe complete', missing: 'Tariffa mancante', pending: 'Dati incompleti', complete: 'Righe compilate complete', empty: 'Nessuna organizzazione abilitata per questo ambito.', source: 'Tariffe dalla bozza della sessione corrente', help: 'Inserisci il ricavo dichiarato solo per rettificare il calcolo; in questo caso serve una motivazione. Quantità vuota significa non dichiarata, 0 significa nessuna vendita.', warning: 'Le bozze restano disponibili cambiando tab. Si perdono ricaricando la pagina o uscendo.' },
};

export function SalesEntry({ master, access, developmentMode, canWrite, language, seasonId, pricingRows, rows, onChange }: {
  master: DNSCoreMaster; access: DNSAccessContext | null; developmentMode: boolean; canWrite: boolean;
  language: 'de' | 'it'; seasonId: string; pricingRows: PricingDraftRow[]; rows: SalesDraftRow[];
  onChange: (rows: SalesDraftRow[]) => void;
}) {
  const t = copy[language];
  const [orgId, setOrgId] = useState('');
  const [channel, setChannel] = useState<SalesChannel>('official');
  const [period, setPeriod] = useState<SalesPeriod>('regular');
  const grants = access?.grants.filter((grant) => grant.active && grant.permissions.includes('ticketSales.read')) ?? [];
  const organizations = master.organizations.filter((org) => {
    if (!Array.isArray(org.reportingAreaIds) || !org.reportingAreaIds.length) return false;
    return developmentMode || access?.isAdmin || grants.some((grant) =>
      grant.scopeType === 'network' ||
      (grant.scopeType === 'organization' && grant.scopeId === org.id) ||
      (grant.scopeType === 'reportingArea' && (org.reportingAreaIds as string[]).includes(grant.scopeId)),
    );
  });
  const org = organizations.find((item) => item.id === orgId) ?? organizations[0];
  const areaIds = Array.isArray(org?.reportingAreaIds) ? org.reportingAreaIds as string[] : [];
  const [selectedArea, setSelectedArea] = useState('');
  const areaId = areaIds.includes(selectedArea) ? selectedArea : areaIds[0] ?? '';
  const editable = canWrite && Boolean(org) && (developmentMode || access?.isAdmin || (access?.grants ?? []).some((grant) =>
    grant.active && grant.permissions.includes('ticketSales.write') &&
    (grant.scopeType === 'network' || (grant.scopeType === 'organization' && grant.scopeId === org?.id) || (grant.scopeType === 'reportingArea' && grant.scopeId === areaId)),
  ));
  const money = (value: number) => new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  const products = Object.keys(productLabels) as ProductCode[];
  const cells = products.map((productCode) => {
    const id = JSON.stringify([seasonId, org?.id, areaId, productCode, channel, period]);
    const draft: SalesDraftRow = rows.find((row) => row.id === id) ?? { id, seasonId, organizationId: org?.id ?? '', reportingAreaId: areaId, productCode, salesChannel: channel, salesPeriod: period, quantity: null, amountOverride: null, amountOverrideReason: '' };
    const price = ['organization', 'reportingArea', 'network'].map((scope) => pricingRows.find((row) =>
      row.seasonId === seasonId && row.scopeType === scope && row.scopeId === (scope === 'organization' ? org?.id : scope === 'reportingArea' ? areaId : 'dolomiti-nordicski') && row.productCode === productCode && row.salesChannel === channel && row.salesPeriod === period,
    )).find((row) => row?.unitPrice !== null && row?.unitPrice !== undefined)?.unitPrice ?? null;
    const calculated = draft.quantity === 0 ? 0 : draft.quantity !== null && price !== null ? Math.round(draft.quantity * price * 100) / 100 : null;
    const valid = draft.quantity !== null && (draft.amountOverride !== null ? Boolean(draft.amountOverrideReason.trim()) : calculated !== null);
    return { draft, price, calculated, valid, amount: valid ? draft.amountOverride ?? calculated : null };
  });
  function patch(draft: SalesDraftRow, values: Partial<SalesDraftRow>) {
    if (!editable) return;
    onChange([...rows.filter((row) => row.id !== draft.id), { ...draft, ...values }]);
  }
  const inputClass = 'w-full rounded-md border border-dns-mid/20 bg-white px-2 py-2 font-alt text-[11px] disabled:bg-dns-bg';
  return <section className="dns-card p-5 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="dns-section-title">{t.title}</h2><span className="dns-pill">{t.draft}</span></div>
    <p className="mt-3 font-alt text-[12px] text-dns-muted">{t.intro}</p>
    <p className="mt-2 font-alt text-[11px] text-dns-muted">{t.warning}</p>
    {!org ? <p className="mt-4">{t.empty}</p> : <>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <label className="text-[11px]">{t.organization}<select className={inputClass} value={org.id} onChange={(event) => setOrgId(event.target.value)}>{organizations.map((item) => <option key={item.id} value={item.id}>{String(item.canonicalName ?? item.id)}</option>)}</select></label>
        <label className="text-[11px]">{t.area}<select className={inputClass} value={areaId} onChange={(event) => setSelectedArea(event.target.value)}>{areaIds.map((id) => <option key={id} value={id}>{String(master.reportingAreas.find((area) => area.id === id)?.canonicalName ?? id)}</option>)}</select></label>
        <label className="text-[11px]">{language === 'de' ? 'Kanal' : 'Canale'}<select className={inputClass} value={channel} onChange={(event) => setChannel(event.target.value as SalesChannel)}>{Object.entries(channelLabels).map(([id, label]) => <option key={id} value={id}>{label[language]}</option>)}</select></label>
        <label className="text-[11px]">{language === 'de' ? 'Periode' : 'Periodo'}<select className={inputClass} value={period} onChange={(event) => setPeriod(event.target.value as SalesPeriod)}>{Object.entries(periodLabels).map(([id, label]) => <option key={id} value={id}>{label[language]}</option>)}</select></label>
      </div>
      <div className="dns-entity-label mt-4"><RegionLogos entityType="reportingArea" entityId={areaId} /><strong className="text-[12px]">{String(master.reportingAreas.find((area) => area.id === areaId)?.canonicalName ?? areaId)}</strong></div>
      <p className="mt-3 font-alt text-[11px] text-dns-muted">{t.source}. {t.help}</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-[11px]"><thead><tr className="border-b border-dns-mid/20"><th className="p-2">{language === 'de' ? 'Produkt' : 'Prodotto'}</th><th className="p-2">{t.quantity}</th><th className="p-2">{t.price}</th><th className="p-2">{t.calculated}</th><th className="p-2">{t.actual}</th><th className="p-2">{t.reason}</th></tr></thead><tbody>
        {cells.map(({draft, price, calculated}) => <tr key={draft.id} className="border-b border-dns-mid/10"><th className="p-2 font-semibold">{productLabels[draft.productCode][language]}</th>
          <td className="w-[115px] p-2"><input aria-label={`${t.quantity} · ${productLabels[draft.productCode][language]}`} className={inputClass} type="number" min="0" step="1" disabled={!editable} value={draft.quantity ?? ''} onChange={(event) => { const value = event.target.value === '' ? null : Number(event.target.value); if (value === null || (Number.isSafeInteger(value) && value >= 0)) patch(draft,{quantity:value}); }} /></td>
          <td className="p-2">{price === null ? t.missing : money(price)}</td><td className="p-2">{calculated === null ? '—' : money(calculated)}</td>
          <td className="w-[130px] p-2"><input aria-label={`${t.actual} · ${productLabels[draft.productCode][language]}`} className={inputClass} type="number" min="0" step="0.01" disabled={!editable} value={draft.amountOverride ?? ''} onChange={(event) => { const value = event.target.value === '' ? null : Number(event.target.value); if (value === null || (Number.isFinite(value) && value >= 0)) patch(draft,{amountOverride:value}); }} /></td>
          <td className="p-2"><input aria-label={`${t.reason} · ${productLabels[draft.productCode][language]}`} className={inputClass} disabled={!editable} value={draft.amountOverrideReason} onChange={(event) => patch(draft,{amountOverrideReason:event.target.value})} aria-invalid={draft.amountOverride !== null && !draft.amountOverrideReason.trim()} /></td>
        </tr>)}
      </tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="font-alt text-[11px] text-dns-muted">{cells.some((cell) => (cell.draft.quantity !== null || cell.draft.amountOverride !== null) && !cell.valid) ? t.pending : cells.some((cell) => cell.valid) ? t.complete : t.draft}</span><strong className="text-[15px]">{t.total}: {money(cells.reduce((sum,cell) => sum + (cell.amount ?? 0),0))}</strong></div>
    </>}
  </section>;
}
