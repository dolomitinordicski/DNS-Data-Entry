import { useEffect, useMemo, useState } from 'react';
import logoUrl from '../logo1.png';
import { modules, type ModuleId } from './config/modules';
import { loadDNSCoreMaster } from './services/dnsCore';
import type { DNSCoreMaster } from './types/master';

type ConnectionState = 'loading' | 'ready' | 'error';
type Language = 'de' | 'it';

const copy = {
  de: {
    operations: 'Operations',
    seasonalOps: 'Saisonale Datenerfassung',
    connected: 'DNS_Core verbunden',
    unavailable: 'DNS_Core nicht erreichbar',
    connecting: 'DNS_Core verbindet…',
    intro:
      'Grundstruktur des neuen DNS Operations Workflows. In diesem ersten Schritt werden nur kanonische Stammdaten aus DNS_Core gelesen; operative Daten werden noch nicht geschrieben.',
    activeSeason: 'Aktive Saison',
    loadingSeason: 'Saison wird geladen',
    reportingAreas: 'Gebiete',
    organizations: 'Organisationen',
    relationships: 'Beziehungen',
    fromCore: 'aus DNS_Core',
    verifiedIdentities: 'verifizierte Stammdaten',
    canonicalLinks: 'kanonische Zuordnungen',
    moduleReady:
      'Modul vorbereitet. Funktionale Eingabemasken und Firestore-Schreibrechte folgen in einem eigenen, kontrollierten Schritt.',
    dataFlow: 'Datenfluss',
    flow: ['Bestellungen', 'Verfügbarkeit', 'Verkäufe', 'Analytics', 'FAIR'],
    accounting:
      'XGLA4 bleibt das offizielle Buchhaltungssystem. DNS Data Entry bildet Bestellungen und Billing Preparation als operative Vorstufe ab.',
  },
  it: {
    operations: 'Operazioni',
    seasonalOps: 'Raccolta dati stagionale',
    connected: 'DNS_Core connesso',
    unavailable: 'DNS_Core non raggiungibile',
    connecting: 'Connessione a DNS_Core…',
    intro:
      'Struttura di base del nuovo workflow operativo DNS. In questo primo step vengono letti soltanto i dati master canonici da DNS_Core; i dati operativi non vengono ancora scritti.',
    activeSeason: 'Stagione attiva',
    loadingSeason: 'Caricamento stagione',
    reportingAreas: 'Aree',
    organizations: 'Organizzazioni',
    relationships: 'Relazioni',
    fromCore: 'da DNS_Core',
    verifiedIdentities: 'anagrafiche master verificate',
    canonicalLinks: 'collegamenti canonici',
    moduleReady:
      'Modulo predisposto. Le maschere di inserimento e i permessi di scrittura Firestore seguiranno in uno step dedicato e controllato.',
    dataFlow: 'Flusso dati',
    flow: ['Ordini', 'Disponibilità', 'Vendite', 'Analytics', 'FAIR'],
    accounting:
      'XGLA4 resta il sistema contabile ufficiale. DNS Data Entry gestisce ordini e Billing Preparation come fase operativa a monte.',
  },
} as const;

function App() {
  const [language, setLanguage] = useState<Language>('de');
  const [activeModule, setActiveModule] = useState<ModuleId>('season');
  const [master, setMaster] = useState<DNSCoreMaster | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('loading');

  const t = copy[language];

  useEffect(() => {
    loadDNSCoreMaster()
      .then((data) => {
        setMaster(data);
        setConnection('ready');
      })
      .catch((error) => {
        console.error('DNS_Core master-data connection failed', error);
        setConnection('error');
      });
  }, []);

  const activeSeason = useMemo(
    () => master?.seasons.find((season) => season.status === 'active'),
    [master],
  );

  const active = modules.find((module) => module.id === activeModule)!;

  return (
    <div className="min-h-screen bg-dns-bg">
      <header className="sticky top-0 z-30 bg-dns-deep text-white shadow-[0_1px_0_rgba(255,255,255,.08)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-4">
            <img
              src={logoUrl}
              alt="Dolomiti NordicSki"
              className="h-10 w-auto shrink-0 object-contain"
            />
            <div>
              <div className="text-[22px] uppercase tracking-[.035em] leading-none">
                <strong>DNS</strong> <span className="font-normal">DATA ENTRY</span>
              </div>
              <div className="mt-1.5 font-alt text-[11px] uppercase tracking-[.06em] text-dns-light">
                {t.seasonalOps}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex rounded-md border border-white/20 bg-white/5 p-0.5">
              {(['de', 'it'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={[
                    'rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.06em] transition',
                    language === lang
                      ? 'bg-white text-dns-deep'
                      : 'text-white/65 hover:text-white',
                  ].join(' ')}
                  aria-pressed={language === lang}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <div
              className={[
                'hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[.05em] sm:flex',
                connection === 'ready' ? 'text-[#d8f0e7]' : '',
                connection === 'error' ? 'text-[#ffd7d0]' : 'text-white/65',
              ].join(' ')}
            >
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  connection === 'ready' ? 'bg-emerald-400' : '',
                  connection === 'error' ? 'bg-orange-400' : 'bg-dns-light',
                ].join(' ')}
              />
              {connection === 'ready'
                ? `${t.connected} · ${master?.reportingAreas.length ?? 0}/${master?.organizations.length ?? 0}`
                : connection === 'error'
                  ? t.unavailable
                  : t.connecting}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-5 py-5 md:px-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="dns-card h-fit p-3">
          <div className="px-2 pb-2 pt-1">
            <div className="dns-kicker">{t.operations}</div>
            <div className="mt-1 text-[18px] font-bold">WS {String(activeSeason?.id ?? '2026-27')}</div>
          </div>
          <nav className="mt-2 space-y-1">
            {modules.map((module) => (
              <button
                key={module.id}
                type="button"
                onClick={() => setActiveModule(module.id)}
                className={[
                  'dns-nav-button w-full',
                  activeModule === module.id
                    ? 'dns-nav-button-active'
                    : 'dns-nav-button-idle',
                ].join(' ')}
              >
                <span className="block">{module.label[language]}</span>
                <span
                  className={[
                    'mt-0.5 block font-alt text-[9px] font-normal normal-case tracking-normal',
                    activeModule === module.id ? 'text-white/70' : 'text-dns-muted',
                  ].join(' ')}
                >
                  {module.subtitle[language]}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-5">
          <section className="dns-card p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="dns-kicker">{active.phase[language]}</div>
                <h1 className="mt-1 text-[27px] font-semibold tracking-[-.02em] text-dns-deep">
                  {active.label[language]}
                </h1>
                <p className="mt-2 max-w-3xl font-alt text-[12px] leading-relaxed text-dns-muted">
                  {t.intro}
                </p>
              </div>
              <span className="dns-pill">
                {activeSeason ? `${t.activeSeason} · ${activeSeason.id}` : t.loadingSeason}
              </span>
            </div>
          </section>

          {activeModule === 'season' ? (
            <section className="grid gap-4 md:grid-cols-3">
              <div className="dns-card border-t-[3px] border-t-dns-light p-5">
                <div className="dns-kicker">{t.reportingAreas}</div>
                <div className="mt-2 text-[28px] font-bold">{master?.reportingAreas.length ?? '—'}</div>
                <div className="mt-1 font-alt text-[10px] text-dns-muted">{t.fromCore}</div>
              </div>
              <div className="dns-card border-t-[3px] border-t-dns-light p-5">
                <div className="dns-kicker">{t.organizations}</div>
                <div className="mt-2 text-[28px] font-bold">{master?.organizations.length ?? '—'}</div>
                <div className="mt-1 font-alt text-[10px] text-dns-muted">{t.verifiedIdentities}</div>
              </div>
              <div className="dns-card border-t-[3px] border-t-dns-light p-5">
                <div className="dns-kicker">{t.relationships}</div>
                <div className="mt-2 text-[28px] font-bold">{master?.organizationRelationships.length ?? '—'}</div>
                <div className="mt-1 font-alt text-[10px] text-dns-muted">{t.canonicalLinks}</div>
              </div>
            </section>
          ) : (
            <section className="dns-card p-6">
              <div className="dns-section-title">{active.label[language]}</div>
              <p className="mt-2 font-alt text-[12px] leading-relaxed text-dns-muted">
                {t.moduleReady}
              </p>
            </section>
          )}

          <section className="dns-card p-5 md:p-6">
            <div className="dns-section-title">{t.dataFlow}</div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {t.flow.map((item, index) => (
                <div key={item} className="relative rounded-lg border border-dns-mid/15 bg-dns-bg px-4 py-4 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-[.05em]">{item}</div>
                  {index < 4 && (
                    <span className="absolute -right-[11px] top-1/2 hidden -translate-y-1/2 text-dns-mid md:block">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 font-alt text-[10px] leading-relaxed text-dns-muted">
              {t.accounting}
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
