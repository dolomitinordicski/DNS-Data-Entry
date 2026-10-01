import { useEffect, useMemo, useState } from 'react';
import { RegionLogos } from '../../components/RegionLogos';
import type { DNSAccessContext } from '../../types/access';
import type { CanonicalRecord, DNSCoreMaster } from '../../types/master';
import {
  loadKpEntries,
  loadKpMilestones,
  saveKpEntry,
  saveKpMilestone,
  type KpEntryDoc,
  type KpMilestoneDoc,
} from '../../services/kp';

type Language = 'de' | 'it';

type Draft = {
  uniqueNetworkKm: number;
  potentialOperationalKm: number;
  values: Record<string, { naturalSnowKm: number; artificialSnowKm: number }>;
  includeInKp: boolean;
  exclusionReason: string;
  notes: string;
};

function ids(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function n(value: number, language: Language, digits = 1) {
  return value.toLocaleString(language === 'it' ? 'it-IT' : 'de-DE', { maximumFractionDigits: digits });
}

function composition(natural: number, artificial: number) {
  const total = natural + artificial;
  if (total <= 0) return { natural: 0, artificial: 0, total: 0 };
  return {
    natural: natural / total * 100,
    artificial: artificial / total * 100,
    total,
  };
}

function blankDraft(milestones: KpMilestoneDoc[]): Draft {
  return {
    uniqueNetworkKm: 0,
    potentialOperationalKm: 0,
    values: Object.fromEntries(milestones.map((item) => [
      item.id,
      { naturalSnowKm: 0, artificialSnowKm: 0 },
    ])),
    includeInKp: true,
    exclusionReason: '',
    notes: '',
  };
}

function fromEntry(entry: KpEntryDoc | undefined, milestones: KpMilestoneDoc[]): Draft {
  if (!entry) return blankDraft(milestones);
  const values = Object.fromEntries(milestones.map((item) => {
    const stored = entry.milestones.find((value) => value.milestoneId === item.id);
    return [item.id, {
      naturalSnowKm: stored?.naturalSnowKm ?? 0,
      artificialSnowKm: stored?.artificialSnowKm ?? 0,
    }];
  }));
  return {
    uniqueNetworkKm: entry.referenceKm.uniqueNetworkKm ?? 0,
    potentialOperationalKm: entry.referenceKm.potentialOperationalKm ?? 0,
    values,
    includeInKp: entry.includeInKp,
    exclusionReason: entry.exclusionReason ?? '',
    notes: entry.notes ?? '',
  };
}

export function KPDataEntry({ seasonId, language, master, access, canWrite, developmentMode }: {
  seasonId: string;
  language: Language;
  master: DNSCoreMaster;
  access: DNSAccessContext;
  canWrite: boolean;
  developmentMode: boolean;
}) {
  const it = language === 'it';
  const [milestones, setMilestones] = useState<KpMilestoneDoc[]>([]);
  const [milestoneDrafts, setMilestoneDrafts] = useState<KpMilestoneDoc[]>([]);
  const [entries, setEntries] = useState<KpEntryDoc[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [draft, setDraft] = useState<Draft>(() => blankDraft([]));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const grants = access.grants.filter((grant) => grant.active);
  const networkRead = access.isAdmin || grants.some((grant) =>
    grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski' && grant.permissions.includes('kp.read'));
  const networkWrite = access.isAdmin || grants.some((grant) =>
    grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski' && grant.permissions.includes('kp.write'));

  const visibleOrganizations = useMemo(() => {
    if (networkRead) return master.organizations;
    const readableOrgs = new Set(grants.filter((grant) =>
      grant.scopeType === 'organization' && grant.permissions.includes('kp.read')).map((grant) => grant.scopeId));
    const readableAreas = new Set(grants.filter((grant) =>
      grant.scopeType === 'reportingArea' && grant.permissions.includes('kp.read')).map((grant) => grant.scopeId));
    return master.organizations.filter((organization) =>
      readableOrgs.has(organization.id) || ids(organization.reportingAreaIds).some((areaId) => readableAreas.has(areaId)));
  }, [master.organizations, grants, networkRead]);

  const visibleAreaIds = useMemo(() => {
    const set = new Set<string>();
    visibleOrganizations.forEach((organization) => ids(organization.reportingAreaIds).forEach((areaId) => set.add(areaId)));
    return set;
  }, [visibleOrganizations]);

  const visibleAreas = master.reportingAreas.filter((area) => visibleAreaIds.has(area.id));
  const selectedArea = visibleAreas.find((area) => area.id === selectedAreaId) ?? visibleAreas[0];
  const areaOrganizations = visibleOrganizations.filter((organization) =>
    selectedArea ? ids(organization.reportingAreaIds).includes(selectedArea.id) : false);
  const selectedOrganization = areaOrganizations.find((organization) => organization.id === selectedOrgId) ?? areaOrganizations[0];

  function canEditOrganization(organization: CanonicalRecord | undefined) {
    if (!organization || developmentMode || !canWrite) return false;
    if (networkWrite) return true;
    const areaIds = ids(organization.reportingAreaIds);
    return grants.some((grant) => grant.permissions.includes('kp.write') && (
      (grant.scopeType === 'organization' && grant.scopeId === organization.id) ||
      (grant.scopeType === 'reportingArea' && areaIds.includes(grant.scopeId))
    ));
  }

  const canManageMilestones = !developmentMode && networkWrite;

  async function reload() {
    if (!access.profile?.active && !access.isAdmin) return;
    const [loadedMilestones, loadedEntries] = await Promise.all([
      loadKpMilestones(seasonId),
      loadKpEntries(seasonId, access),
    ]);
    setMilestones(loadedMilestones);
    setMilestoneDrafts([1, 2, 3].map((order) =>
      loadedMilestones.find((item) => item.order === order) ?? {
        id: `${seasonId}__m${order}`,
        seasonId,
        date: '',
        label: `Milestone ${order}`,
        order,
      }));
    setEntries(loadedEntries);
  }

  useEffect(() => {
    void reload().catch((error) => {
      console.error('KP load failed', error);
      setStatus(it ? 'Impossibile caricare i dati KP.' : 'KP-Daten konnten nicht geladen werden.');
    });
  }, [seasonId, access.profile?.id]);

  useEffect(() => {
    if (!selectedAreaId && visibleAreas[0]) setSelectedAreaId(visibleAreas[0].id);
  }, [visibleAreas.map((area) => area.id).join('|')]);

  useEffect(() => {
    if (selectedArea && !areaOrganizations.some((organization) => organization.id === selectedOrgId)) {
      setSelectedOrgId(areaOrganizations[0]?.id ?? '');
    }
  }, [selectedArea?.id, areaOrganizations.map((organization) => organization.id).join('|')]);

  useEffect(() => {
    const entry = selectedOrganization ? entries.find((item) => item.entityId === selectedOrganization.id) : undefined;
    setDraft(fromEntry(entry, milestones));
  }, [selectedOrganization?.id, entries, milestones]);

  async function persistMilestones() {
    setBusy(true);
    setStatus('');
    try {
      const configured = milestoneDrafts.filter((item) => item.date);
      for (const item of configured) await saveKpMilestone(item);
      await reload();
      setStatus(it ? 'Milestone salvate in Firebase.' : 'Meilensteine in Firebase gespeichert.');
    } catch (error) {
      console.error('KP milestone save failed', error);
      setStatus(it ? 'Salvataggio milestone non riuscito.' : 'Meilensteine konnten nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  }

  async function persistEntry() {
    if (!selectedOrganization || !selectedArea) return;
    setBusy(true);
    setStatus('');
    try {
      const id = `${seasonId}__${selectedOrganization.id}`;
      await saveKpEntry({
        id,
        seasonId,
        entityType: 'organization',
        entityId: selectedOrganization.id,
        reportingAreaId: selectedArea.id,
        referenceKm: {
          uniqueNetworkKm: Math.max(0, draft.uniqueNetworkKm),
          potentialOperationalKm: Math.max(0, draft.potentialOperationalKm),
        },
        milestones: milestones.map((item) => ({
          milestoneId: item.id,
          naturalSnowKm: Math.max(0, draft.values[item.id]?.naturalSnowKm ?? 0),
          artificialSnowKm: Math.max(0, draft.values[item.id]?.artificialSnowKm ?? 0),
        })),
        includeInKp: draft.includeInKp,
        exclusionReason: draft.includeInKp ? '' : draft.exclusionReason.trim(),
        notes: draft.notes.trim(),
      });
      await reload();
      setStatus(it ? 'KP salvato in Firebase.' : 'KP in Firebase gespeichert.');
    } catch (error) {
      console.error('KP save failed', error);
      setStatus(it ? 'Salvataggio KP non riuscito.' : 'KP konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  }

  const latestMilestone = [...milestones].sort((a, b) => b.order - a.order)[0];
  const latestTotals = entries.reduce((total, entry) => {
    const value = latestMilestone ? entry.milestones.find((item) => item.milestoneId === latestMilestone.id) : undefined;
    if (!value || !entry.includeInKp) return total;
    total.natural += value.naturalSnowKm;
    total.artificial += value.artificialSnowKm;
    return total;
  }, { natural: 0, artificial: 0 });
  const latestComposition = composition(latestTotals.natural, latestTotals.artificial);

  return <div className="space-y-5">
    <section className="dns-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="dns-section-title">KP · Kunstschneeproduktion</h2>
          <p className="mt-2 max-w-4xl text-sm text-dns-muted">
            {it
              ? 'KP descrive il rapporto tra chilometri con neve naturale (NS) e chilometri con neve artificiale (KS) allo stesso momento di rilevazione. Viene mostrato come quota NS / quota KS sul totale NS+KS. I km potenziali restano un indicatore separato.'
              : 'KP beschreibt das Verhältnis zwischen Kilometern mit Naturschnee (NS) und Kilometern mit Kunstschnee (KS) zum selben Stichtag. Angezeigt werden NS-Anteil / KS-Anteil an NS+KS. Potenzielle Kilometer bleiben ein separater Indikator.'}
          </p>
        </div>
        <span className="dns-pill">{it ? 'Data Entry attivo' : 'Datenerfassung aktiv'}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">{it ? 'Partner compilati' : 'Erfasste Partner'}</div>
          <div className="mt-1 text-2xl font-semibold">{entries.length}</div>
        </div>
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">{it ? 'Milestone configurate' : 'Konfigurierte Stichtage'}</div>
          <div className="mt-1 text-2xl font-semibold">{milestones.length}/3</div>
        </div>
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">{it ? 'NS · ultima milestone' : 'NS · letzter Stichtag'}</div>
          <div className="mt-1 text-2xl font-semibold">{latestComposition.total ? n(latestComposition.natural, language) + '%' : '—'}</div>
        </div>
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">{it ? 'KS · ultima milestone' : 'KS · letzter Stichtag'}</div>
          <div className="mt-1 text-2xl font-semibold">{latestComposition.total ? n(latestComposition.artificial, language) + '%' : '—'}</div>
        </div>
      </div>
      {latestComposition.total > 0 && <p className="mt-3 text-xs text-dns-muted">
        {it ? 'Somma dei record partner inclusi nel KP' : 'Summe der im KP enthaltenen Partnerdatensätze'} · NS {n(latestTotals.natural, language)} km / KS {n(latestTotals.artificial, language)} km
      </p>}
    </section>

    <section className="dns-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="dns-section-title">{it ? 'Milestone stagionali' : 'Saison-Meilensteine'}</h3>
          <p className="mt-1 text-xs text-dns-muted">{it ? 'Le date valgono per tutta la rete DNS.' : 'Die Stichtage gelten für das gesamte DNS-Netz.'}</p>
        </div>
        {canManageMilestones && <button type="button" onClick={() => void persistMilestones()} disabled={busy}
          className="rounded-md bg-dns-deep px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {it ? 'Salva milestone' : 'Stichtage speichern'}
        </button>}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {milestoneDrafts.map((item, index) => <label key={item.id} className="rounded-lg bg-dns-bg p-4">
          <span className="text-xs font-bold uppercase tracking-[.05em] text-dns-mid">{it ? 'Milestone' : 'Stichtag'} {item.order}</span>
          <input type="date" value={item.date} disabled={!canManageMilestones || busy}
            onChange={(event) => setMilestoneDrafts((current) => current.map((row, rowIndex) =>
              rowIndex === index ? { ...row, date: event.target.value } : row))}
            className="mt-2 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-sm disabled:opacity-60" />
        </label>)}
      </div>
      {!canManageMilestones && <p className="mt-3 text-xs text-dns-muted">{it ? 'Le date possono essere configurate da DNS Admin o da un utente con permesso KP di rete.' : 'Stichtage können von DNS Admin oder einem Benutzer mit netzweitem KP-Recht konfiguriert werden.'}</p>}
    </section>

    <section className="dns-card p-6">
      <h3 className="dns-section-title">{it ? 'Inserimento partner' : 'Partner-Erfassung'}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-dns-muted">
          {it ? 'Area' : 'Region'}
          <select value={selectedArea?.id ?? ''} onChange={(event) => setSelectedAreaId(event.target.value)}
            className="dns-context-selector mt-1 w-full px-3 py-2 text-[11px]">
            {visibleAreas.map((area) => <option key={area.id} value={area.id}>{String(area.canonicalName ?? area.id)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-dns-muted">
          Partner
          <select value={selectedOrganization?.id ?? ''} onChange={(event) => setSelectedOrgId(event.target.value)}
            className="dns-context-selector mt-1 w-full px-3 py-2 text-[11px]">
            {areaOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{String(organization.canonicalName ?? organization.id)}</option>)}
          </select>
        </label>
      </div>

      {selectedArea && selectedOrganization ? <div className="mt-5 space-y-5">
        <div className="flex items-center gap-3">
          <RegionLogos entityType="reportingArea" entityId={selectedArea.id} />
          <div><div className="font-semibold">{String(selectedOrganization.canonicalName ?? selectedOrganization.id)}</div>
            <div className="text-xs text-dns-muted">{String(selectedArea.canonicalName ?? selectedArea.id)}</div></div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-dns-muted">{it ? 'Km rete fisici / unici' : 'Physische / eindeutige Netz-km'}
            <input type="number" min="0" step="0.1" value={draft.uniqueNetworkKm}
              disabled={!canEditOrganization(selectedOrganization) || busy}
              onChange={(event) => setDraft((current) => ({ ...current, uniqueNetworkKm: Number(event.target.value) }))}
              className="mt-1 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-semibold text-dns-muted">{it ? 'Km potenziali operativi' : 'Operative Potenzial-km'}
            <input type="number" min="0" step="0.1" value={draft.potentialOperationalKm}
              disabled={!canEditOrganization(selectedOrganization) || busy}
              onChange={(event) => setDraft((current) => ({ ...current, potentialOperationalKm: Number(event.target.value) }))}
              className="mt-1 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-sm" />
          </label>
        </div>

        {milestones.length === 0 ? <div className="rounded-lg bg-dns-bg p-4 text-sm text-dns-muted">
          {it ? 'Configura almeno una milestone prima di inserire i km NS/KS.' : 'Mindestens einen Stichtag konfigurieren, bevor NS-/KS-km erfasst werden.'}
        </div> : <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="p-2 text-left">{it ? 'Rilevazione' : 'Stichtag'}</th><th className="p-2 text-right">NS km</th><th className="p-2 text-right">KS km</th><th className="p-2 text-right">KP · NS / KS</th></tr></thead>
            <tbody>{milestones.map((item) => {
              const value = draft.values[item.id] ?? { naturalSnowKm: 0, artificialSnowKm: 0 };
              const kp = composition(value.naturalSnowKm, value.artificialSnowKm);
              return <tr key={item.id} className="border-t border-dns-mid/10">
                <td className="p-2"><strong>{item.date}</strong><span className="block text-[10px] text-dns-muted">{item.label}</span></td>
                <td className="p-2 text-right"><input type="number" min="0" step="0.1" value={value.naturalSnowKm}
                  disabled={!canEditOrganization(selectedOrganization) || busy}
                  onChange={(event) => setDraft((current) => ({ ...current, values: { ...current.values, [item.id]: { ...value, naturalSnowKm: Number(event.target.value) } } }))}
                  className="w-28 rounded-md border border-dns-mid/20 bg-white px-2 py-1.5 text-right" /></td>
                <td className="p-2 text-right"><input type="number" min="0" step="0.1" value={value.artificialSnowKm}
                  disabled={!canEditOrganization(selectedOrganization) || busy}
                  onChange={(event) => setDraft((current) => ({ ...current, values: { ...current.values, [item.id]: { ...value, artificialSnowKm: Number(event.target.value) } } }))}
                  className="w-28 rounded-md border border-dns-mid/20 bg-white px-2 py-1.5 text-right" /></td>
                <td className="p-2 text-right tabular-nums">{kp.total ? `${n(kp.natural, language)}% / ${n(kp.artificial, language)}%` : '—'}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.includeInKp} disabled={!canEditOrganization(selectedOrganization) || busy}
              onChange={(event) => setDraft((current) => ({ ...current, includeInKp: event.target.checked }))} />
            {it ? 'Includi nel calcolo KP' : 'In KP-Berechnung einbeziehen'}
          </label>
          {!draft.includeInKp && <input type="text" value={draft.exclusionReason}
            disabled={!canEditOrganization(selectedOrganization) || busy}
            onChange={(event) => setDraft((current) => ({ ...current, exclusionReason: event.target.value }))}
            placeholder={it ? 'Motivo esclusione' : 'Ausschlussgrund'}
            className="rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-sm" />}
        </div>

        <textarea value={draft.notes} disabled={!canEditOrganization(selectedOrganization) || busy}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          placeholder={it ? 'Note operative (opzionale)' : 'Operative Notizen (optional)'}
          className="min-h-20 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-sm" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-dns-muted">{entries.some((entry) => entry.entityId === selectedOrganization.id)
            ? (it ? 'Record esistente: il salvataggio crea automaticamente una revisione audit.' : 'Bestehender Datensatz: Beim Speichern wird automatisch eine Audit-Revision angelegt.')
            : (it ? 'Nuovo record KP.' : 'Neuer KP-Datensatz.')}</p>
          <button type="button" onClick={() => void persistEntry()}
            disabled={!canEditOrganization(selectedOrganization) || busy || milestones.length === 0}
            className="rounded-md bg-dns-deep px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {busy ? (it ? 'Salvataggio…' : 'Speichern…') : (it ? 'Salva KP' : 'KP speichern')}
          </button>
        </div>
      </div> : <p className="mt-4 text-sm text-dns-muted">{it ? 'Nessun partner disponibile nel tuo ambito.' : 'Keine Partner im eigenen Zugriffsbereich verfügbar.'}</p>}

      {status && <p role="status" className="mt-4 text-sm text-dns-muted">{status}</p>}
    </section>
  </div>;
}
