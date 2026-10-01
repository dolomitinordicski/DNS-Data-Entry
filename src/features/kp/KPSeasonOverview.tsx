import { RegionLogos } from '../../components/RegionLogos';
import type { CanonicalRecord } from '../../types/master';

export type KpSourceRecord = {
  id: string;
  label: string;
  organizationId: string;
  reportingAreaId: string;
  facts: Array<Record<string, unknown>>;
};

type Language = 'de' | 'it';

type CuratedArea = {
  id: string;
  names: [string, string];
  potentialKm: number;
  milestones: [
    { date: string; openedKm: number; artificialKm: number },
    { date: string; openedKm: number; artificialKm: number },
    { date: string; openedKm: number; artificialKm: number },
  ];
  note?: [string, string];
};

const CURATED_2025_26: CuratedArea[] = [
  { id: 'antholzertal', names: ['Valle di Anterselva', 'Antholzertal'], potentialKm: 45, milestones: [
    { date: '2025-12-23', openedKm: 23.2, artificialKm: 23.2 },
    { date: '2026-01-06', openedKm: 24.3, artificialKm: 24.3 },
    { date: '2026-01-20', openedKm: 35.9, artificialKm: 33.5 },
  ], note: ['Biathlon escluso dal KP', 'Biathlon vom KP ausgeschlossen'] },
  { id: 'gsiesertal-welsberg-taisten', names: ['Val Casies–Monguelfo–Tesido', 'Gsiesertal–Welsberg–Taisten'], potentialKm: 40, milestones: [
    { date: '2025-12-23', openedKm: 42.7, artificialKm: 42.7 },
    { date: '2026-01-06', openedKm: 42.7, artificialKm: 42.7 },
    { date: '2026-01-20', openedKm: 43.2, artificialKm: 42.7 },
  ], note: ['Percentuali cappate al 100%', 'Prozentwerte bei 100% gedeckelt'] },
  { id: 'drei-zinnen', names: ['3 Cime Dolomites', '3 Zinnen Dolomites'], potentialKm: 153, milestones: [
    { date: '2025-12-23', openedKm: 42.0, artificialKm: 42.0 },
    { date: '2026-01-06', openedKm: 56.1, artificialKm: 50.1 },
    { date: '2026-01-20', openedKm: 58.5, artificialKm: 47.3 },
  ] },
  { id: 'osttirol', names: ['Osttirol', 'Osttirol'], potentialKm: 256, milestones: [
    { date: '2025-12-23', openedKm: 23.0, artificialKm: 20.0 },
    { date: '2026-01-06', openedKm: 41.0, artificialKm: 31.0 },
    { date: '2026-01-20', openedKm: 45.2, artificialKm: 35.2 },
  ], note: ['Dato provvisorio · snowfarming Obertilliach da verificare', 'Vorläufig · Snowfarming Obertilliach zu prüfen'] },
  { id: 'ahrntal', names: ['Valle Aurina + Campo Tures', 'Ahrntal + Sand in Taufers'], potentialKm: 51, milestones: [
    { date: '2025-12-23', openedKm: 34.5, artificialKm: 4.0 },
    { date: '2026-01-06', openedKm: 44.5, artificialKm: 14.0 },
    { date: '2026-01-20', openedKm: 49.0, artificialKm: 14.0 },
  ] },
  { id: 'seiser-alm-dolomites-val-gardena', names: ['Alpe di Siusi–Val Gardena', 'Seiser Alm–Gröden'], potentialKm: 90, milestones: [
    { date: '2025-12-23', openedKm: 53.9, artificialKm: 3.6 },
    { date: '2026-01-06', openedKm: 86.9, artificialKm: 3.6 },
    { date: '2026-01-20', openedKm: 111.8, artificialKm: 3.0 },
  ], note: ['Apertura cappata al 100% nel KPI', 'Öffnung im KPI bei 100% gedeckelt'] },
  { id: 'val-comelico', names: ['Comelico', 'Comelico'], potentialKm: 61, milestones: [
    { date: '2025-12-23', openedKm: 1.5, artificialKm: 1.5 },
    { date: '2026-01-06', openedKm: 2.5, artificialKm: 2.5 },
    { date: '2026-01-20', openedKm: 42.0, artificialKm: 12.0 },
  ] },
  { id: 'cortina-d-ampezzo', names: ['Cortina d’Ampezzo', 'Cortina d’Ampezzo'], potentialKm: 20, milestones: [
    { date: '2025-12-23', openedKm: 0, artificialKm: 0 },
    { date: '2026-01-06', openedKm: 0, artificialKm: 0 },
    { date: '2026-01-20', openedKm: 10.0, artificialKm: 0 },
  ] },
];

function pct(value: number, base: number) {
  return base > 0 ? Math.min(100, value / base * 100) : 0;
}

function metric(value: number, language: Language, digits = 1) {
  return value.toLocaleString(language === 'it' ? 'it-IT' : 'de-DE', { maximumFractionDigits: digits });
}

function statusFor(kp: number, language: Language) {
  if (kp >= 70) return language === 'it' ? 'Alta dipendenza KS' : 'Hohe KS-Abhängigkeit';
  if (kp >= 30) return language === 'it' ? 'Mix KS / NS' : 'Mix KS / NS';
  return language === 'it' ? 'Prevalenza NS' : 'Überwiegend Naturschnee';
}

function EmptyFramework({ seasonId, language, reportingAreas }: {
  seasonId: string;
  language: Language;
  reportingAreas: CanonicalRecord[];
}) {
  const it = language === 'it';
  return <div className="space-y-5">
    <section className="dns-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="dns-section-title">KP · WS {seasonId}</h2>
          <p className="mt-2 max-w-3xl text-sm text-dns-muted">
            {it
              ? 'Struttura KP pronta. Nessun valore è precompilato: i dati della stagione compariranno qui quando saranno raccolti.'
              : 'KP-Struktur ist vorbereitet. Es sind keine Werte vorbefüllt; Saisondaten erscheinen hier erst nach der Erfassung.'}
          </p>
        </div>
        <span className="dns-pill">{it ? 'In attesa dati' : 'Daten ausstehend'}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          it ? 'Km potenziali' : 'Potenzial km',
          it ? 'Km aperti' : 'Geöffnete km',
          it ? 'Km neve artificiale' : 'Kunstschnee km',
          'KP',
        ].map((label) => <div key={label} className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-dns-deep">—</div>
        </div>)}
      </div>
    </section>

    <section className="dns-card p-6">
      <h3 className="dns-section-title">{it ? 'Milestone stagionali' : 'Saison-Meilensteine'}</h3>
      <p className="mt-2 text-sm text-dns-muted">
        {it
          ? 'La stagione userà lo stesso modello del 2025–26: tre rilevazioni, con km naturali, artificiali e apertura per area.'
          : 'Die Saison verwendet dasselbe Modell wie 2025/26: drei Stichtage mit Natur-, Kunstschnee- und Öffnungskilometern je Region.'}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((index) => <div key={index} className="rounded-lg bg-dns-bg p-4">
          <div className="text-xs font-bold uppercase tracking-[.05em] text-dns-mid">
            {it ? 'Milestone ' + index : 'Meilenstein ' + index}
          </div>
          <div className="mt-2 text-sm text-dns-muted">{it ? 'Data da configurare' : 'Datum noch festzulegen'}</div>
        </div>)}
      </div>
    </section>

    <section className="dns-card p-6">
      <h3 className="dns-section-title">{it ? 'Copertura per area' : 'Abdeckung nach Region'}</h3>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {reportingAreas.map((area) => <div key={area.id} className="flex items-center gap-3 rounded-lg border border-dns-mid/10 px-3 py-3">
          <RegionLogos entityType="reportingArea" entityId={area.id} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{String(area.canonicalName ?? area.id)}</div>
            <div className="mt-0.5 text-xs text-dns-muted">{it ? 'Nessun dato KP ancora' : 'Noch keine KP-Daten'}</div>
          </div>
          <span className="dns-pill">—</span>
        </div>)}
      </div>
    </section>
  </div>;
}

export function KPSeasonOverview({ seasonId, language, records = [], reportingAreas = [] }: {
  seasonId: string;
  language: Language;
  records?: KpSourceRecord[];
  reportingAreas?: CanonicalRecord[];
}) {
  const it = language === 'it';

  if (seasonId !== '2025-26') {
    return <EmptyFramework seasonId={seasonId} language={language} reportingAreas={reportingAreas} />;
  }

  const finalMilestone = CURATED_2025_26.map((area) => ({
    ...area,
    final: area.milestones[2],
    openingPct: pct(area.milestones[2].openedKm, area.potentialKm),
    kp: pct(area.milestones[2].artificialKm, area.potentialKm),
  }));

  const rawByArea = new Map<string, KpSourceRecord[]>();
  for (const record of records) {
    const list = rawByArea.get(record.reportingAreaId) ?? [];
    list.push(record);
    rawByArea.set(record.reportingAreaId, list);
  }

  return <div className="space-y-5">
    <section className="dns-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="dns-section-title">KP · WS 2025–26</h2>
          <p className="mt-2 max-w-3xl text-sm text-dns-muted">
            {it
              ? 'Quadro regionale curato dal precedente DNS Analytics, affiancato ai record partner originali e immutabili conservati nello storico.'
              : 'Kuratierte Regionssicht aus dem bisherigen DNS Analytics, ergänzt um die unveränderlichen Original-Partnerdaten aus der Historie.'}
          </p>
        </div>
        <span className="dns-pill">{it ? 'Storico verificabile' : 'Prüfbare Historie'}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">{it ? 'Potenziale DNS' : 'DNS Potenzial'}</div>
          <div className="mt-1 text-2xl font-semibold">736 km</div>
        </div>
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">23.12.2025</div>
          <div className="mt-1 text-2xl font-semibold">220,5 km</div>
          <div className="mt-1 text-xs text-dns-muted">30,0% {it ? 'rete aperta' : 'Netz geöffnet'}</div>
        </div>
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">20.01.2026</div>
          <div className="mt-1 text-2xl font-semibold">384,8 km</div>
          <div className="mt-1 text-xs text-dns-muted">52,3% {it ? 'rete aperta' : 'Netz geöffnet'}</div>
        </div>
        <div className="rounded-lg border border-dns-mid/15 p-4">
          <div className="text-xs uppercase text-dns-muted">{it ? 'KS al 20.01' : 'KS am 20.01'}</div>
          <div className="mt-1 text-2xl font-semibold">207,7 km</div>
          <div className="mt-1 text-xs text-dns-muted">54,0% {it ? 'del totale aperto' : 'der geöffneten km'}</div>
        </div>
      </div>
    </section>

    <section className="dns-card p-6">
      <h3 className="dns-section-title">{it ? 'Apertura rete · tre milestone' : 'Netzöffnung · drei Meilensteine'}</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="p-2 text-left">{it ? 'Area' : 'Region'}</th>
            <th className="p-2 text-right">23.12.2025</th>
            <th className="p-2 text-right">06.01.2026</th>
            <th className="p-2 text-right">20.01.2026</th>
            <th className="p-2 text-right">KP</th>
          </tr></thead>
          <tbody>{CURATED_2025_26.map((area) => {
            const kp = pct(area.milestones[2].artificialKm, area.potentialKm);
            return <tr key={area.id} className="border-t border-dns-mid/10">
              <td className="p-2">
                <span className="flex items-center gap-2">
                  <RegionLogos entityType="reportingArea" entityId={area.id} />
                  <span><strong>{area.names[it ? 0 : 1]}</strong>{area.note && <span className="block text-[10px] text-dns-muted">{area.note[it ? 0 : 1]}</span>}</span>
                </span>
              </td>
              {area.milestones.map((milestone) => <td key={milestone.date} className="p-2 text-right tabular-nums">
                {metric(pct(milestone.openedKm, area.potentialKm), language)}%
                <span className="block text-[10px] text-dns-muted">{metric(milestone.openedKm, language)} km</span>
              </td>)}
              <td className="p-2 text-right tabular-nums"><strong>{metric(kp, language)}%</strong><span className="block text-[10px] text-dns-muted">{statusFor(kp, language)}</span></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    <section className="dns-card p-6">
      <h3 className="dns-section-title">{it ? 'Quadro regionale al 20.01.2026' : 'Regionsbild am 20.01.2026'}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {finalMilestone.map((area) => <div key={area.id} className="rounded-lg border border-dns-mid/15 p-4">
          <div className="flex items-center gap-3">
            <RegionLogos entityType="reportingArea" entityId={area.id} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{area.names[it ? 0 : 1]}</div>
              <div className="mt-0.5 text-xs text-dns-muted">{metric(area.final.openedKm, language)} / {metric(area.potentialKm, language)} km {it ? 'aperti' : 'geöffnet'}</div>
            </div>
            <div className="text-right"><div className="text-lg font-semibold">{metric(area.kp, language)}%</div><div className="text-[10px] text-dns-muted">KP</div></div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-dns-bg">
            <div className="h-full bg-dns-mid" style={{ width: Math.min(100, area.openingPct) + '%' }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dns-muted">
            <span>{it ? 'Apertura' : 'Öffnung'} {metric(area.openingPct, language)}%</span>
            <span>KS {metric(area.final.artificialKm, language)} km</span>
            <span>NS / {it ? 'senza KS' : 'ohne KS'} {metric(Math.max(0, area.final.openedKm - area.final.artificialKm), language)} km</span>
          </div>
        </div>)}
      </div>
    </section>

    {records.length > 0 && <section className="dns-card p-6">
      <h3 className="dns-section-title">{it ? 'Record originali · drill-down partner' : 'Originaldaten · Partner-Drill-down'}</h3>
      <p className="mt-2 text-sm text-dns-muted">
        {it
          ? 'Questi valori provengono direttamente dal file KP importato. Restano separati dal livello regionale curato.'
          : 'Diese Werte stammen direkt aus der importierten KP-Datei und bleiben von der kuratierten Regionssicht getrennt.'}
      </p>
      <div className="mt-4 space-y-2">
        {[...rawByArea.entries()].map(([areaId, areaRecords]) => <details key={areaId} className="rounded-lg border border-dns-mid/15">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
            <RegionLogos entityType="reportingArea" entityId={areaId} />
            <strong className="flex-1">{CURATED_2025_26.find((area) => area.id === areaId)?.names[it ? 0 : 1] ?? areaId}</strong>
            <span className="text-xs text-dns-muted">{areaRecords.length} {it ? 'record' : 'Datensätze'}</span>
          </summary>
          <div className="overflow-x-auto border-t border-dns-mid/10 px-3 py-3">
            <table className="w-full text-xs">
              <thead><tr>
                <th className="p-2 text-left">Partner</th>
                <th className="p-2 text-left">{it ? 'Data' : 'Datum'}</th>
                <th className="p-2 text-right">{it ? 'Riferimento km' : 'Referenz km'}</th>
                <th className="p-2 text-right">NS km</th>
                <th className="p-2 text-right">KS km</th>
                <th className="p-2 text-right">{it ? 'Aperti' : 'Geöffnet'}</th>
              </tr></thead>
              <tbody>{areaRecords.flatMap((record) => record.facts.map((fact, index) => {
                const natural = typeof fact.naturalKm === 'number' ? fact.naturalKm : 0;
                const artificial = typeof fact.artificialKm === 'number' ? fact.artificialKm : 0;
                return <tr key={record.id + '-' + index} className="border-t border-dns-mid/10">
                  <td className="p-2">{index === 0 ? record.label : ''}</td>
                  <td className="p-2">{String(fact.date ?? '—')}</td>
                  <td className="p-2 text-right tabular-nums">{typeof fact.referenceKm === 'number' ? metric(fact.referenceKm, language, 2) : '—'}</td>
                  <td className="p-2 text-right tabular-nums">{metric(natural, language, 2)}</td>
                  <td className="p-2 text-right tabular-nums">{metric(artificial, language, 2)}</td>
                  <td className="p-2 text-right tabular-nums">{metric(natural + artificial, language, 2)}</td>
                </tr>;
              }))}</tbody>
            </table>
          </div>
        </details>)}
      </div>
    </section>}

    <section className="dns-card p-5">
      <h3 className="dns-section-title">{it ? 'Nota metodologica' : 'Methodischer Hinweis'}</h3>
      <p className="mt-2 text-sm text-dns-muted">
        {it
          ? 'Il vecchio file KP contiene denominatori regionali, km partner e percentuali non sempre additivi tra loro. Per questo il quadro regionale curato di Analytics viene conservato come livello interpretativo separato dai record originali. Dal 2026–27 il modello è già predisposto per separare km unici, km potenziali operativi e milestone.'
          : 'Die alte KP-Datei enthält regionale Nenner, Partner-km und Prozentwerte, die nicht immer additiv sind. Deshalb bleibt die kuratierte Analytics-Regionssicht als eigene Interpretationsebene von den Originaldaten getrennt. Ab 2026/27 ist das Modell bereits für eindeutige Netz-km, operative Potenzial-km und Meilensteine vorbereitet.'}
      </p>
    </section>
  </div>;
}
