import { useEffect, useMemo, useState } from 'react';
import { KP_MILESTONES_2026_27 } from '@dolomitinordicski/dns-shared-data/kp-setup-2026-27';
import { RegionLogos } from '../../components/RegionLogos';
import type { DNSAccessContext } from '../../types/access';
import type { CanonicalRecord, DNSCoreMaster } from '../../types/master';
import {
  loadKpEntries,
  loadKpFairValidations,
  loadKpMilestones,
  saveKpEntry,
  saveKpMilestone,
  validateKpFairCandidate,
  type KpEntryDoc,
  type KpFairValidationDoc,
  type KpMilestoneDoc,
} from '../../services/kp';

type Language = 'de' | 'it';

type Draft = {
  uniqueNetworkKm: number;
  potentialOperationalKm: number;
  values: Record<string, { openedKm: number; artificialSnowKm: number }>;
  includeInKp: boolean;
  exclusionReason: string;
  notes: string;
};

type Candidate = {
  potentialOperationalKm: number;
  openedKm: number;
  naturalSnowKm: number;
  artificialSnowKm: number;
  partnerCount: number;
};

const DEFAULT_MILESTONES_2026_27: KpMilestoneDoc[] = KP_MILESTONES_2026_27.map((milestone) => ({
  ...milestone,
  label: milestone.label ?? `Milestone ${milestone.order}`,
}));

function ids(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function n(value: number, language: Language, digits = 1) {
  return value.toLocaleString(language === 'it' ? 'it-IT' : 'de-DE', {
    maximumFractionDigits: digits,
  });
}

function pct(value: number, base: number) {
  return base > 0 ? value / base * 100 : 0;
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.011;
}

function snowMix(openedKm: number, artificialSnowKm: number) {
  const naturalSnowKm = Math.max(0, openedKm - artificialSnowKm);
  return {
    naturalSnowKm,
    naturalPct: pct(naturalSnowKm, openedKm),
    artificialPct: pct(artificialSnowKm, openedKm),
  };
}

function blankDraft(milestones: KpMilestoneDoc[]): Draft {
  return {
    uniqueNetworkKm: 0,
    potentialOperationalKm: 0,
    values: Object.fromEntries(milestones.map((item) => [
      item.id,
      { openedKm: 0, artificialSnowKm: 0 },
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
    const openedKm = stored?.openedKm ?? ((stored?.naturalSnowKm ?? 0) + (stored?.artificialSnowKm ?? 0));
    return [item.id, {
      openedKm,
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

function candidateForArea(
  entries: KpEntryDoc[],
  reportingAreaId: string,
  milestoneId: string,
): Candidate {
  return entries
    .filter((entry) => entry.reportingAreaId === reportingAreaId && entry.includeInKp)
    .reduce<Candidate>((total, entry) => {
      const value = entry.milestones.find((item) => item.milestoneId === milestoneId);
      if (!value) return total;
      const openedKm = value.openedKm ?? (value.naturalSnowKm + value.artificialSnowKm);
      total.potentialOperationalKm += entry.referenceKm.potentialOperationalKm ?? 0;
      total.openedKm += openedKm;
      total.artificialSnowKm += value.artificialSnowKm;
      total.naturalSnowKm += Math.max(0, openedKm - value.artificialSnowKm);
      total.partnerCount += 1;
      return total;
    }, {
      potentialOperationalKm: 0,
      openedKm: 0,
      naturalSnowKm: 0,
      artificialSnowKm: 0,
      partnerCount: 0,
    });
}

function validationMatches(validation: KpFairValidationDoc | undefined, candidate: Candidate) {
  return Boolean(validation)
    && nearlyEqual(validation!.potentialOperationalKm, candidate.potentialOperationalKm)
    && nearlyEqual(validation!.openedKm, candidate.openedKm)
    && nearlyEqual(validation!.naturalSnowKm, candidate.naturalSnowKm)
    && nearlyEqual(validation!.artificialSnowKm, candidate.artificialSnowKm);
}

export function KPDataEntry({ seasonId, language, master, access, canWrite, canVerify, developmentMode }: {
  seasonId: string;
  language: Language;
  master: DNSCoreMaster;
  access: DNSAccessContext;
  canWrite: boolean;
  canVerify: boolean;
  developmentMode: boolean;
}) {
  const it = language === 'it';
  const [milestones, setMilestones] = useState<KpMilestoneDoc[]>([]);
  const [milestoneDrafts, setMilestoneDrafts] = useState<KpMilestoneDoc[]>([]);
  const [entries, setEntries] = useState<KpEntryDoc[]>([]);
  const [validations, setValidations] = useState<KpFairValidationDoc[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [draft, setDraft] = useState<Draft>(() => blankDraft([]));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const grants = access.grants.filter((grant) => grant.active);
  const networkRead = access.isAdmin || grants.some((grant) =>
    grant.scopeType === 'network'
    && grant.scopeId === 'dolomiti-nordicski'
    && grant.permissions.includes('kp.read'));
  const networkWrite = access.isAdmin || grants.some((grant) =>
    grant.scopeType === 'network'
    && grant.scopeId === 'dolomiti-nordicski'
    && grant.permissions.includes('kp.write'));

  const visibleOrganizations = useMemo(() => {
    if (networkRead) return master.organizations;
    const readableOrgs = new Set(grants.filter((grant) =>
      grant.scopeType === 'organization' && grant.permissions.includes('kp.read')).map((grant) => grant.scopeId));
    const readableAreas = new Set(grants.filter((grant) =>
      grant.scopeType === 'reportingArea' && grant.permissions.includes('kp.read')).map((grant) => grant.scopeId));
    return master.organizations.filter((organization) =>
      readableOrgs.has(organization.id)
      || ids(organization.reportingAreaIds).some((areaId) => readableAreas.has(areaId)));
  }, [master.organizations, grants, networkRead]);

  const visibleAreaIds = useMemo(() => {
    const set = new Set<string>();
    visibleOrganizations.forEach((organization) =>
      ids(organization.reportingAreaIds).forEach((areaId) => set.add(areaId)));
    return set;
  }, [visibleOrganizations]);

  const visibleAreas = master.reportingAreas.filter((area) => visibleAreaIds.has(area.id));
  const selectedArea = visibleAreas.find((area) => area.id === selectedAreaId) ?? visibleAreas[0];
  const areaOrganizations = visibleOrganizations.filter((organization) =>
    selectedArea ? ids(organization.reportingAreaIds).includes(selectedArea.id) : false);
  const selectedOrganization =
    areaOrganizations.find((organization) => organization.id === selectedOrgId) ?? areaOrganizations[0];

  function canEditOrganization(organization: CanonicalRecord | undefined) {
    if (!organization || developmentMode || !canWrite) return false;
    if (networkWrite) return true;
    const areaIds = ids(organization.reportingAreaIds);
    return grants.some((grant) => grant.permissions.includes('kp.write') && (
      (grant.scopeType === 'organization' && grant.scopeId === organization.id)
      || (grant.scopeType === 'reportingArea' && areaIds.includes(grant.scopeId))
    ));
  }

  const canManageMilestones = !developmentMode && networkWrite;
  const canValidateSelectedArea = Boolean(selectedArea)
    && !developmentMode
    && canVerify
    && (access.isAdmin || grants.some((grant) =>
      grant.permissions.includes('kp.verify') && (
        (grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski')
        || (grant.scopeType === 'reportingArea' && grant.scopeId === selectedArea?.id)
      )));

  async function reload() {
    if (!access.profile?.active && !access.isAdmin) return;
    const [loadedMilestones, loadedEntries, loadedValidations] = await Promise.all([
      loadKpMilestones(seasonId),
      loadKpEntries(seasonId, access),
      loadKpFairValidations(seasonId, access),
    ]);
    const effectiveMilestones = loadedMilestones.length > 0
      ? loadedMilestones
      : seasonId === '2026-27'
        ? DEFAULT_MILESTONES_2026_27
        : [];
    setMilestones(effectiveMilestones);
    setMilestoneDrafts([1, 2, 3].map((order) =>
      effectiveMilestones.find((item) => item.order === order) ?? {
        id: `${seasonId}__m${order}`,
        seasonId,
        date: '',
        label: `Milestone ${order}`,
        order,
      }));
    setEntries(loadedEntries);
    setValidations(loadedValidations);
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
    const entry = selectedOrganization
      ? entries.find((item) => item.entityId === selectedOrganization.id)
      : undefined;
    setDraft(fromEntry(entry, milestones));
  }, [selectedOrganization?.id, entries, milestones]);

  async function persistMilestones() {
    setBusy(true);
    setStatus('');
    try {
      const configured = milestoneDrafts.filter((item) => item.date);
      for (const item of configured) await saveKpMilestone(item);
      await reload();
      setStatus(it ? 'Milestone salvate in Firebase.' : 'Stichtage in Firebase gespeichert.');
    } catch (error) {
      console.error('KP milestone save failed', error);
      setStatus(it ? 'Salvataggio milestone non riuscito.' : 'Stichtage konnten nicht gespeichert werden.');
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
        milestones: milestones.map((item) => {
          const openedKm = Math.max(0, draft.values[item.id]?.openedKm ?? 0);
          const artificialSnowKm = Math.min(
            openedKm,
            Math.max(0, draft.values[item.id]?.artificialSnowKm ?? 0),
          );
          return {
            milestoneId: item.id,
            openedKm,
            naturalSnowKm: Math.max(0, openedKm - artificialSnowKm),
            artificialSnowKm,
          };
        }),
        includeInKp: draft.includeInKp,
        exclusionReason: draft.includeInKp ? '' : draft.exclusionReason.trim(),
        notes: draft.notes.trim(),
      });
      await reload();
      setStatus(it ? 'Dati KP salvati in Firebase.' : 'KP-Daten in Firebase gespeichert.');
    } catch (error) {
      console.error('KP save failed', error);
      setStatus(it ? 'Salvataggio KP non riuscito.' : 'KP konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  }

  async function validateCandidate(milestone: KpMilestoneDoc, candidate: Candidate) {
    if (!selectedArea) return;
    setBusy(true);
    setStatus('');
    try {
      await validateKpFairCandidate({
        id: `${seasonId}__${selectedArea.id}__${milestone.id}`,
        seasonId,
        reportingAreaId: selectedArea.id,
        milestoneId: milestone.id,
        potentialOperationalKm: candidate.potentialOperationalKm,
        openedKm: candidate.openedKm,
        naturalSnowKm: candidate.naturalSnowKm,
        artificialSnowKm: candidate.artificialSnowKm,
      });
      await reload();
      setStatus(it ? 'KP FAIR validato.' : 'KP FAIR validiert.');
    } catch (error) {
      console.error('KP FAIR validation failed', error);
      setStatus(it ? 'Validazione KP FAIR non riuscita.' : 'KP FAIR konnte nicht validiert werden.');
    } finally {
      setBusy(false);
    }
  }

  const latestMilestone = [...milestones].sort((a, b) => b.order - a.order)[0];
  const latestNetwork = latestMilestone
    ? visibleAreas.reduce<Candidate>((total, area) => {
        const candidate = candidateForArea(entries, area.id, latestMilestone.id);
        total.potentialOperationalKm += candidate.potentialOperationalKm;
        total.openedKm += candidate.openedKm;
        total.naturalSnowKm += candidate.naturalSnowKm;
        total.artificialSnowKm += candidate.artificialSnowKm;
        total.partnerCount += candidate.partnerCount;
        return total;
      }, { potentialOperationalKm: 0, openedKm: 0, naturalSnowKm: 0, artificialSnowKm: 0, partnerCount: 0 })
    : null;

  return <div className="space-y-5">
    <section className="dns-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="dns-section-title">KP · Kunstschneeproduktion</h2>
          <p className="mt-2 max-w-4xl text-sm text-dns-muted">
            {it
              ? 'Due letture dello stesso dato: Snow Mix descrive la composizione NS/KS; KP FAIR misura la quota di km innevati artificialmente sui km aperti (KS / aperti × 100). I km potenziali servono separatamente per misurare l’apertura della rete.'
              : 'Zwei Auswertungen derselben Grunddaten: Snow Mix beschreibt die NS/KS-Zusammensetzung; KP FAIR misst den Anteil künstlich beschneiter Kilometer an den geöffneten Kilometern (KS / geöffnet × 100). Potenzielle Kilometer messen separat die Netzöffnung.'}
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
          <div className="text-xs uppercase text-dns-muted">{it ? 'Milestone' : 'Stichtage'}</div>
          <div className="mt-1 text-2xl font-semibold">{milestones.length}/3</div>
        </div>
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">{it ? 'Apertura rete · ultima' : 'Netzöffnung · letzter'}</div>
          <div className="mt-1 text-2xl font-semibold">
            {latestNetwork && latestNetwork.potentialOperationalKm > 0
              ? n(pct(latestNetwork.openedKm, latestNetwork.potentialOperationalKm), language) + '%'
              : '—'}
          </div>
        </div>
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">KP FAIR · {it ? 'ultima' : 'letzter'}</div>
          <div className="mt-1 text-2xl font-semibold">
            {latestNetwork && latestNetwork.openedKm > 0
              ? n(pct(latestNetwork.artificialSnowKm, latestNetwork.openedKm), language) + '%'
              : '—'}
          </div>
        </div>
      </div>
    </section>

    <section className="dns-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="dns-section-title">{it ? 'Milestone stagionali' : 'Saison-Stichtage'}</h3>
          <p className="mt-1 text-xs text-dns-muted">
            {it ? 'Le tre date valgono per tutta la rete DNS.' : 'Die drei Stichtage gelten für das gesamte DNS-Netz.'}
          </p>
        </div>
        {canManageMilestones && <button type="button" onClick={() => void persistMilestones()} disabled={busy}
          className="dns-button disabled:opacity-50" data-variant="primary">
          {it ? 'Salva milestone' : 'Stichtage speichern'}
        </button>}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {milestoneDrafts.map((item, index) => <label key={item.id} className="rounded-lg bg-dns-bg p-4">
          <span className="text-xs font-bold uppercase tracking-[.05em] text-dns-mid">
            {it ? 'Milestone' : 'Stichtag'} {item.order}
          </span>
          <input type="date" value={item.date} disabled={!canManageMilestones || busy}
            onChange={(event) => setMilestoneDrafts((current) => current.map((row, rowIndex) =>
              rowIndex === index
                ? { ...row, date: event.target.value, label: event.target.value }
                : row))}
            className="dns-input mt-2 text-sm disabled:opacity-60" />
        </label>)}
      </div>
    </section>

    <section className="dns-card p-6">
      <h3 className="dns-section-title">{it ? 'Inserimento partner' : 'Partner-Erfassung'}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-dns-muted">
          {it ? 'Area' : 'Region'}
          <select value={selectedArea?.id ?? ''} onChange={(event) => setSelectedAreaId(event.target.value)}
            className="dns-select dns-context-select mt-1 w-full px-3 py-2 text-[11px]">
            {visibleAreas.map((area) =>
              <option key={area.id} value={area.id}>{String(area.canonicalName ?? area.id)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-dns-muted">
          Partner
          <select value={selectedOrganization?.id ?? ''} onChange={(event) => setSelectedOrgId(event.target.value)}
            className="dns-select dns-context-select mt-1 w-full px-3 py-2 text-[11px]">
            {areaOrganizations.map((organization) =>
              <option key={organization.id} value={organization.id}>{String(organization.canonicalName ?? organization.id)}</option>)}
          </select>
        </label>
      </div>

      {selectedArea && selectedOrganization ? <div className="mt-5 space-y-5">
        <div className="flex items-center gap-3">
          <RegionLogos entityType="reportingArea" entityId={selectedArea.id} />
          <div>
            <div className="font-semibold">{String(selectedOrganization.canonicalName ?? selectedOrganization.id)}</div>
            <div className="text-xs text-dns-muted">{String(selectedArea.canonicalName ?? selectedArea.id)}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-dns-muted">
            {it ? 'Km rete fisici / unici' : 'Physische / eindeutige Netz-km'}
            <input type="number" min="0" step="0.1" value={draft.uniqueNetworkKm}
              disabled={!canEditOrganization(selectedOrganization) || busy}
              onChange={(event) => setDraft((current) => ({ ...current, uniqueNetworkKm: Number(event.target.value) }))}
              className="dns-input mt-1 text-sm" />
          </label>
          <label className="text-xs font-semibold text-dns-muted">
            {it ? 'Km potenziali operativi' : 'Operative Potenzial-km'}
            <input type="number" min="0" step="0.1" value={draft.potentialOperationalKm}
              disabled={!canEditOrganization(selectedOrganization) || busy}
              onChange={(event) => setDraft((current) => ({ ...current, potentialOperationalKm: Number(event.target.value) }))}
              className="dns-input mt-1 text-sm" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="dns-table">
            <thead><tr>
              <th className="p-2 text-left">{it ? 'Rilevazione' : 'Stichtag'}</th>
              <th className="p-2 text-right">{it ? 'Aperti km' : 'Geöffnet km'}</th>
              <th className="p-2 text-right">KS km</th>
              <th className="p-2 text-right">NS km</th>
              <th className="p-2 text-right">{it ? 'Apertura' : 'Öffnung'}</th>
              <th className="p-2 text-right">Snow Mix</th>
              <th className="p-2 text-right">KP FAIR</th>
            </tr></thead>
            <tbody>{milestones.map((item) => {
              const value = draft.values[item.id] ?? { openedKm: 0, artificialSnowKm: 0 };
              const openedKm = Math.max(0, value.openedKm);
              const artificialSnowKm = Math.min(openedKm, Math.max(0, value.artificialSnowKm));
              const mix = snowMix(openedKm, artificialSnowKm);
              return <tr key={item.id} className="border-t border-dns-mid/10">
                <td className="p-2"><strong>{item.date}</strong></td>
                <td className="p-2 text-right">
                  <input type="number" min="0" step="0.1" value={value.openedKm}
                    disabled={!canEditOrganization(selectedOrganization) || busy}
                    onChange={(event) => {
                      const opened = Math.max(0, Number(event.target.value));
                      setDraft((current) => ({
                        ...current,
                        values: {
                          ...current.values,
                          [item.id]: {
                            openedKm: opened,
                            artificialSnowKm: Math.min(opened, current.values[item.id]?.artificialSnowKm ?? 0),
                          },
                        },
                      }));
                    }}
                    className="dns-input w-24 py-1.5 text-right" />
                </td>
                <td className="p-2 text-right">
                  <input type="number" min="0" max={openedKm} step="0.1" value={value.artificialSnowKm}
                    disabled={!canEditOrganization(selectedOrganization) || busy}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      values: {
                        ...current.values,
                        [item.id]: {
                          ...value,
                          artificialSnowKm: Math.min(openedKm, Math.max(0, Number(event.target.value))),
                        },
                      },
                    }))}
                    className="dns-input w-24 py-1.5 text-right" />
                </td>
                <td className="p-2 text-right tabular-nums">{n(mix.naturalSnowKm, language)}</td>
                <td className="p-2 text-right tabular-nums">
                  {draft.potentialOperationalKm > 0 ? n(pct(openedKm, draft.potentialOperationalKm), language) + '%' : '—'}
                </td>
                <td className="p-2 text-right tabular-nums">
                  {openedKm > 0 ? `NS ${n(mix.naturalPct, language)}% / KS ${n(mix.artificialPct, language)}%` : '—'}
                </td>
                <td className="p-2 text-right tabular-nums font-semibold">
                  {openedKm > 0 ? n(pct(artificialSnowKm, openedKm), language) + '%' : '—'}
                </td>
              </tr>;
            })}</tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="dns-check">
            <input type="checkbox" checked={draft.includeInKp}
              disabled={!canEditOrganization(selectedOrganization) || busy}
              onChange={(event) => setDraft((current) => ({ ...current, includeInKp: event.target.checked }))} />
            {it ? 'Includi nel calcolo KP area / FAIR' : 'In Regions-KP / FAIR einbeziehen'}
          </label>
          {!draft.includeInKp && <input type="text" value={draft.exclusionReason}
            disabled={!canEditOrganization(selectedOrganization) || busy}
            onChange={(event) => setDraft((current) => ({ ...current, exclusionReason: event.target.value }))}
            placeholder={it ? 'Motivo esclusione' : 'Ausschlussgrund'}
            className="dns-input text-sm" />}
        </div>

        <textarea value={draft.notes} disabled={!canEditOrganization(selectedOrganization) || busy}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          placeholder={it ? 'Note operative (opzionale)' : 'Operative Notizen (optional)'}
          className="dns-textarea min-h-20 text-sm" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-dns-muted">
            {entries.some((entry) => entry.entityId === selectedOrganization.id)
              ? (it ? 'Il salvataggio crea automaticamente una revisione audit.' : 'Beim Speichern wird automatisch eine Audit-Revision angelegt.')
              : (it ? 'Nuovo record KP.' : 'Neuer KP-Datensatz.')}
          </p>
          <button type="button" onClick={() => void persistEntry()}
            disabled={!canEditOrganization(selectedOrganization) || busy || milestones.length === 0}
            className="dns-button disabled:opacity-50" data-variant="primary">
            {busy ? (it ? 'Salvataggio…' : 'Speichern…') : (it ? 'Salva dati KP' : 'KP-Daten speichern')}
          </button>
        </div>
      </div> : <p className="mt-4 text-sm text-dns-muted">
        {it ? 'Nessun partner disponibile nel tuo ambito.' : 'Keine Partner im eigenen Zugriffsbereich verfügbar.'}
      </p>}

      {status && <p role="status" className="mt-4 text-sm text-dns-muted">{status}</p>}
    </section>

    {selectedArea && <section className="dns-card p-6">
      <div className="flex items-center gap-3">
        <RegionLogos entityType="reportingArea" entityId={selectedArea.id} />
        <div>
          <h3 className="dns-section-title">{it ? 'KP FAIR · candidato area' : 'KP FAIR · Regionskandidat'}</h3>
          <p className="mt-1 text-xs text-dns-muted">
            {it
              ? 'Calcolato automaticamente dai partner inclusi. La validazione non modifica FAIR: certifica soltanto lo snapshot da usare come input.'
              : 'Automatisch aus den einbezogenen Partnern berechnet. Die Validierung verändert FAIR nicht; sie bestätigt nur den Snapshot als Eingabewert.'}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="dns-table">
          <thead><tr>
            <th className="p-2 text-left">{it ? 'Milestone' : 'Stichtag'}</th>
            <th className="p-2 text-right">{it ? 'Potenziali' : 'Potenzial'}</th>
            <th className="p-2 text-right">{it ? 'Aperti' : 'Geöffnet'}</th>
            <th className="p-2 text-right">KS</th>
            <th className="p-2 text-right">{it ? 'Apertura' : 'Öffnung'}</th>
            <th className="p-2 text-right">Snow Mix</th>
            <th className="p-2 text-right">KP FAIR</th>
            <th className="p-2 text-right">{it ? 'Stato' : 'Status'}</th>
          </tr></thead>
          <tbody>{milestones.map((milestone) => {
            const candidate = candidateForArea(entries, selectedArea.id, milestone.id);
            const mix = snowMix(candidate.openedKm, candidate.artificialSnowKm);
            const validation = validations.find((item) =>
              item.reportingAreaId === selectedArea.id && item.milestoneId === milestone.id);
            const valid = validationMatches(validation, candidate);
            const stale = Boolean(validation) && !valid;
            return <tr key={milestone.id} className="border-t border-dns-mid/10">
              <td className="p-2">
                <strong>{milestone.date}</strong>
                <span className="block text-[10px] text-dns-muted">
                  {candidate.partnerCount} {it ? 'partner inclusi' : 'Partner einbezogen'}
                </span>
              </td>
              <td className="p-2 text-right tabular-nums">{n(candidate.potentialOperationalKm, language)} km</td>
              <td className="p-2 text-right tabular-nums">{n(candidate.openedKm, language)} km</td>
              <td className="p-2 text-right tabular-nums">{n(candidate.artificialSnowKm, language)} km</td>
              <td className="p-2 text-right tabular-nums">
                {candidate.potentialOperationalKm > 0 ? n(pct(candidate.openedKm, candidate.potentialOperationalKm), language) + '%' : '—'}
              </td>
              <td className="p-2 text-right tabular-nums">
                {candidate.openedKm > 0 ? `NS ${n(mix.naturalPct, language)}% / KS ${n(mix.artificialPct, language)}%` : '—'}
              </td>
              <td className="p-2 text-right tabular-nums font-semibold">
                {candidate.openedKm > 0 ? n(pct(candidate.artificialSnowKm, candidate.openedKm), language) + '%' : '—'}
              </td>
              <td className="p-2 text-right">
                <div className="flex flex-col items-end gap-1">
                  <span className="dns-pill">
                    {valid
                      ? (it ? 'Validato FAIR' : 'FAIR validiert')
                      : stale
                        ? (it ? 'Da rivalidare' : 'Neu validieren')
                        : (it ? 'Candidate' : 'Kandidat')}
                  </span>
                  {canValidateSelectedArea && candidate.openedKm > 0 && !valid && <button
                    type="button"
                    disabled={busy}
                    onClick={() => void validateCandidate(milestone, candidate)}
                    className="text-[10px] font-semibold uppercase tracking-[.04em] text-dns-mid underline disabled:opacity-50">
                    {stale
                      ? (it ? 'Rivalida' : 'Neu validieren')
                      : (it ? 'Valida per FAIR' : 'Für FAIR validieren')}
                  </button>}
                </div>
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-dns-muted">
        {it
          ? 'FAIR rimane completamente indipendente: qui viene validato soltanto il dato di ingresso. Il motore, i pesi e la logica FAIR non vengono modificati.'
          : 'FAIR bleibt vollständig unabhängig: Hier wird ausschließlich der Eingabewert validiert. FAIR-Motor, Gewichtungen und Logik werden nicht verändert.'}
      </p>
    </section>}
  </div>;
}
