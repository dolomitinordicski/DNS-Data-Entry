import { useState } from 'react';
import { RegionLogos } from './RegionLogos';
import type { DNSCoreMaster } from '../types/master';
import type { DNSAccessContext, DNSPermission } from '../types/access';

export function ActiveArea({ master, access, developmentMode, permission, language }: {
  master: DNSCoreMaster; access: DNSAccessContext | null; developmentMode: boolean;
  permission: DNSPermission; language: 'de' | 'it';
}) {
  const [selectedId, setSelectedId] = useState('');
  const grants = access?.grants.filter((grant) => grant.active && grant.permissions.includes(permission)) ?? [];
  const allAreas = developmentMode || access?.isAdmin || grants.some((grant) => grant.scopeType === 'network');
  const visibleIds = new Set<string>();
  for (const grant of grants) {
    if (grant.scopeType === 'reportingArea') visibleIds.add(grant.scopeId);
    if (grant.scopeType === 'destination') {
      const destination = master.destinations.find((item) => item.id === grant.scopeId);
      if (typeof destination?.reportingAreaId === 'string') visibleIds.add(destination.reportingAreaId);
    }
    if (grant.scopeType === 'organization') {
      const organization = master.organizations.find((item) => item.id === grant.scopeId);
      if (Array.isArray(organization?.reportingAreaIds)) {
        organization.reportingAreaIds.forEach((id) => { if (typeof id === 'string') visibleIds.add(id); });
      }
    }
  }
  const areas = master.reportingAreas.filter((area) => allAreas || visibleIds.has(area.id));
  const selected = areas.find((area) => area.id === selectedId) ?? areas[0];
  if (!selected) return null;
  const label = language === 'de' ? 'Aktives Gebiet' : 'Area attiva';
  return <section className="dns-card p-5 md:p-6">
    <label className="dns-section-title" htmlFor="dns-active-area">{label}</label>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <RegionLogos entityType="reportingArea" entityId={selected.id} />
      <select id="dns-active-area" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}
        className="max-w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2 text-[11px] text-dns-deep">
        {areas.map((area) => <option key={area.id} value={area.id}>{String(area.canonicalName ?? area.id)}</option>)}
      </select>
    </div>
  </section>;
}
