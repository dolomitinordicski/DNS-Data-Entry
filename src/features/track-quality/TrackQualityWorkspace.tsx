import { useMemo, useState } from 'react';
import type { DNSAccessContext } from '../../types/access';
import type { DNSCoreMaster } from '../../types/master';
import { TrackQualityEntry } from './TrackQualityEntry';

export function TrackQualityWorkspace({ seasonId, language, master, access }: {
  seasonId: string; language: 'it'|'de'; master: DNSCoreMaster; access: DNSAccessContext;
}) {
  const choices = useMemo(() => master.organizations.flatMap((organization) => {
    const areas = Array.isArray(organization.reportingAreaIds) ? organization.reportingAreaIds as string[] : [];
    return areas.filter((areaId) => access.isAdmin || access.grants.some((grant) =>
      grant.active && grant.permissions.includes('kp.read') &&
      ((grant.scopeType === 'organization' && grant.scopeId === organization.id) ||
       (grant.scopeType === 'reportingArea' && grant.scopeId === areaId) ||
       (grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski'))
    )).map((areaId) => ({ id: organization.id + '::' + areaId, organizationId: organization.id,
      reportingAreaId: areaId, label: String(organization.canonicalName ?? organization.id) + ' · ' + areaId }));
  }), [master, access]);
  const [choiceId, setChoiceId] = useState('');
  const selected = choices.find((choice) => choice.id === choiceId) ?? choices[0];
  if (!selected) return <p>{language === 'it' ? 'Nessuna organizzazione autorizzata.' : 'Keine berechtigte Organisation.'}</p>;
  const canWrite = access.isAdmin || access.grants.some((grant) =>
    grant.active && grant.permissions.includes('kp.write') &&
    ((grant.scopeType === 'organization' && grant.scopeId === selected.organizationId) ||
     (grant.scopeType === 'reportingArea' && grant.scopeId === selected.reportingAreaId) ||
     (grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski'))
  );
  return <div className="space-y-4">
    <label className="block text-xs">{language === 'it' ? 'Organizzazione e area' : 'Organisation und Gebiet'}
      <select className="dns-input mt-2 w-full" value={selected.id}
        onChange={(event) => setChoiceId(event.target.value)}>
        {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
      </select>
    </label>
    <TrackQualityEntry key={seasonId + selected.id} seasonId={seasonId}
      reportingAreaId={selected.reportingAreaId} organizationId={selected.organizationId}
      language={language} canWrite={canWrite}/>
  </div>;
}
