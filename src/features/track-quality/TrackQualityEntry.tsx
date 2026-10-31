import { useEffect, useState } from 'react';
import {
  createTrackQualityDraft, loadTrackQuality, saveTrackQuality,
  type TrackQualityRow, type TrackQualityStatus,
} from './trackQualityPersistence';

type Props = {
  seasonId: string;
  reportingAreaId: string;
  organizationId: string;
  canWrite: boolean;
  language: 'it' | 'de';
};

const statuses: TrackQualityStatus[] = ['unreported', 'yes', 'partial', 'no'];
const labels = {
  it: { title: 'Controllo qualità piste', track: 'Pista', km: 'Km complessivi', early: 'Preparata entro 8 dicembre', late: 'Preparata dal 23 dicembre', part: 'Km unici preparati (se parziale)', close: 'Data chiusura', notes: 'Note', add: 'Aggiungi pista', save: 'Salva', loading: 'Caricamento', empty: 'Nessuna pista inserita per questa stagione.', yes: 'Sì', partial: 'Parziale', no: 'No', unreported: 'Da compilare', saved: 'Salvato su Firebase', error: 'Operazione non riuscita', readOnly: 'Sola lettura' },
  de: { title: 'Loipen Qualitätskontrolle', track: 'Loipe', km: 'Gesamtkilometer', early: 'Bis 8. Dezember präpariert', late: 'Ab 23. Dezember präpariert', part: 'Präparierte Einzel-km (bei teilweise)', close: 'Schließungsdatum', notes: 'Notizen', add: 'Loipe hinzufügen', save: 'Speichern', loading: 'Lädt', empty: 'Keine Loipen für diese Saison erfasst.', yes: 'Ja', partial: 'Teilweise', no: 'Nein', unreported: 'Nicht gemeldet', saved: 'In Firebase gespeichert', error: 'Vorgang fehlgeschlagen', readOnly: 'Nur Lesen' },
};
export function TrackQualityEntry({ seasonId, reportingAreaId, organizationId, canWrite, language }: Props) {
  const t = labels[language];
  const [rows, setRows] = useState<TrackQualityRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    setRows([]); setStatus(''); setBusy(true);
    loadTrackQuality(seasonId, reportingAreaId, organizationId)
      .then((data) => { if (active) setRows(data); })
      .catch((error) => { if (active) setStatus(String(error)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [seasonId, reportingAreaId, organizationId]);
  function update(id: string, patch: Partial<TrackQualityRow>) {
    if (!canWrite || busy) return;
    setRows((previous) => previous.map((r) => r.id === id ? { ...r, ...patch } : r));
  }
  async function save(row: TrackQualityRow) {
    if (!canWrite || busy) return;
    setBusy(true); setStatus('');
    try {
      const revision = await saveTrackQuality(row);
      setRows((previous) => previous.map((r) => r.id === row.id ? { ...r, revision } : r));
      setStatus(t.saved);
    } catch (error) { setStatus(t.error + ': ' + String(error)); }
    finally { setBusy(false); }
  }
  const numeric = (value: number | null) => value ?? '';
  const numberValue = (raw: string) => raw.trim() === '' ? null : Number(raw);
  return <section className="dns-card p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="dns-section-title">{t.title} · {seasonId}</h2>
      {!canWrite && <span className="dns-kicker">{t.readOnly}</span>}
    </div>
    {busy && <p role="status">{t.loading}</p>}
    {status && <p role="status" className="text-sm">{status}</p>}
    {!rows.length && !busy && <p>{t.empty}</p>}
    {rows.map((row) => <div key={row.id} className="rounded-xl border border-dns-mid/20 p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs">{t.track}<input className="dns-input mt-1 w-full" disabled={!canWrite || busy} value={row.trackName} onChange={e=>update(row.id,{trackName:e.target.value})}/></label>
        <label className="text-xs">{t.km}<input className="dns-input mt-1 w-full" type="number" min="0" step="0.01" disabled={!canWrite || busy} value={numeric(row.totalKm)} onChange={e=>update(row.id,{totalKm:numberValue(e.target.value)})}/></label>
        {(['earlyDecember','lateDecember'] as const).map((field) => {
          const kmField = field === 'earlyDecember' ? 'earlyDecemberKm' : 'lateDecemberKm';
          return <div key={field} className="space-y-2">
            <label className="text-xs">{field === 'earlyDecember' ? t.early : t.late}
              <select className="dns-input mt-1 w-full" disabled={!canWrite || busy} value={row[field]} onChange={e=>update(row.id,{[field]:e.target.value,[kmField]:null})}>
                {statuses.map(s=><option key={s} value={s}>{t[s]}</option>)}
              </select>
            </label>
            {row[field]==='partial' && <label className="text-xs">{t.part}
              <input className="dns-input mt-1 w-full" type="number" min="0" step="0.01" disabled={!canWrite || busy} value={numeric(row[kmField])} onChange={e=>update(row.id,{[kmField]:numberValue(e.target.value)})}/>
            </label>}
          </div>;
        })}
        <label className="text-xs">{t.close}<input className="dns-input mt-1 w-full" type="date" disabled={!canWrite || busy} value={row.closedAt} onChange={e=>update(row.id,{closedAt:e.target.value})}/></label>
        <label className="text-xs">{t.notes}<textarea className="dns-input mt-1 w-full" disabled={!canWrite || busy} value={row.notes} onChange={e=>update(row.id,{notes:e.target.value})}/></label>
      </div>
      <button type="button" className="dns-button" data-variant="primary" disabled={!canWrite || busy} onClick={()=>void save(row)}>{t.save}</button>
    </div>)}
    {canWrite && <button type="button" className="dns-button" data-variant="secondary" disabled={busy} onClick={()=>setRows(previous=>[...previous,createTrackQualityDraft(seasonId,reportingAreaId,organizationId)])}>{t.add}</button>}
  </section>;
}
