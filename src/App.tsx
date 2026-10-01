import { HistoricalSeason } from './features/season/HistoricalSeason';
import { KPDataEntry } from './features/kp/KPDataEntry';
import { loadPricing, savePricing, persistenceMessage } from './services/seasonalPersistence';
import { SalesEntry } from './features/sales/SalesEntry';
import type { SalesDraftRow } from './types/sales';
import { AccessibilityMount } from './components/AccessibilityMount';
import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { DNS_SHARED_BRAND } from './config/brand';
import { MODULE_READ_PERMISSION } from './config/access';
import {
  DEV_AREA_TEST_LABEL,
  devAccessFor,
  type DevPersona,
} from './config/devAccess';
import { modules, type ModuleId } from './config/modules';
import { createInitialPricingDraft } from './config/pricing';
import { LoginScreen } from './features/auth/LoginScreen';
import { PricingSetup } from './features/pricing/PricingSetup';
import { WireIcon } from './components/WireIcon';
import { TicketOrdersTable } from './features/orders/TicketOrdersTable';
import { PublicOrderSharePage } from './features/orders/PublicOrderSharePage';
import { SeasonSetup } from './features/season/SeasonSetup';
import { SeasonSelector } from './features/season/SeasonSelector';
import {
  loadAccessContext,
  signOut as dnsSignOut,
  subscribeToAuth,
} from './services/auth';
import { loadDNSCoreMaster } from './services/dnsCore';
import {
  applyDNSDesignFallback,
  dnsRuntimeSignature,
  loadAndApplyDNSDesignSystem,
} from './services/designSystem';
import { initDNSUIRuntime } from './services/uiRuntime';
import { formatDNSCoreHeaderStatus } from '@dolomitinordicski/dns-shared-data/ui/header-status';
import type { DNSAccessContext, DNSPermission } from './types/access';
import type { DNSCoreMaster } from './types/master';
import type { PricingDraftRow } from './types/pricing';
import {
  dataContractsForModule,
  DNS_DATA_CONTRACTS_VERSION,
} from './config/dataContracts';

type ConnectionState = 'loading' | 'ready' | 'error';
type Language = 'de' | 'it';



const copy = {
  de: {
    operations: 'Operations',
    seasonalOps: 'Saisonale Datenerfassung',
    activeSeason: 'Aktive Saison',
    loadingSeason: 'Saison wird geladen',
    moduleReady:
      'Modul vorbereitet. Funktionale Eingabemasken und Firestore-Schreibrechte folgen in einem eigenen, kontrollierten Schritt.',
    dataFlow: 'Datenfluss',
    flow: ['Bestellungen', 'Verfügbarkeit', 'Verkäufe', 'Analytics', 'FAIR'],
    accounting:
      'XGLA4 bleibt das offizielle Buchhaltungssystem. DNS Data Entry bildet Bestellungen und Billing Preparation als operative Vorstufe ab.',
    footerMain: 'Dolomiti NordicSki · DNS Data Entry',
    footerSub: 'Saisonale Operationsdaten · DNS_Core',
    signOut: 'Abmelden',
    noAccessTitle: 'Kein Zugriff freigeschaltet',
    noAccess:
      'Das Konto ist authentifiziert, hat aber noch kein aktives DNS-Benutzerprofil bzw. keine gültigen Zugriffsrechte.',
    authLoading: 'Zugriff wird geprüft…',
    admin: 'DNS Admin',
    scoped: 'Freigeschalteter Benutzer',
    readOnly: 'Nur Lesen',
    devMode: 'DEV MODE',
    devAdmin: 'DNS ADMIN',
    devArea: 'AREA TEST',
    devAreaScope: '3 Zinnen · simulierte Bereichssicht',
    exitDev: 'Dev-Modus verlassen',
  },
  it: {
    operations: 'Operazioni',
    seasonalOps: 'Raccolta dati stagionale',
    activeSeason: 'Stagione attiva',
    loadingSeason: 'Caricamento stagione',
    moduleReady:
      'Modulo predisposto. Le maschere di inserimento e i permessi di scrittura Firestore seguiranno in uno step dedicato e controllato.',
    dataFlow: 'Flusso dati',
    flow: ['Ordini', 'Disponibilità', 'Vendite', 'Analytics', 'FAIR'],
    accounting:
      'XGLA4 resta il sistema contabile ufficiale. DNS Data Entry gestisce ordini e Billing Preparation come fase operativa a monte.',
    footerMain: 'Dolomiti NordicSki · DNS Data Entry',
    footerSub: 'Dati operativi stagionali · DNS_Core',
    signOut: 'Esci',
    noAccessTitle: 'Accesso non abilitato',
    noAccess:
      'L’account è autenticato, ma non dispone ancora di un profilo DNS attivo o di autorizzazioni valide.',
    authLoading: 'Verifica accesso…',
    admin: 'DNS Admin',
    scoped: 'Utente abilitato',
    readOnly: 'Sola lettura',
    devMode: 'DEV MODE',
    devAdmin: 'DNS ADMIN',
    devArea: 'AREA TEST',
    devAreaScope: '3 Zinnen · vista area simulata',
    exitDev: 'Esci dalla modalità sviluppo',
  },
} as const;

function App() {
  const publicShareId = new URLSearchParams(window.location.search).get('share');

  const [language, setLanguage] = useState<Language>('de');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleId>('season');
  const [master, setMaster] = useState<DNSCoreMaster | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('loading');
  const [pricingStatus, setPricingStatus] = useState('');
  const [pricingBusy, setPricingBusy] = useState(false);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [salesRows, setSalesRows] = useState<SalesDraftRow[]>([]);
  const [pricingRows, setPricingRows] = useState<PricingDraftRow[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [access, setAccess] = useState<DNSAccessContext | null>(null);
  const [developmentMode, setDevelopmentMode] = useState(
    () => sessionStorage.getItem('dns-development-mode') === '1',
  );
  const [devPersona, setDevPersona] = useState<DevPersona>(
    () => sessionStorage.getItem('dns-dev-persona') === 'area-test' ? 'area-test' : 'admin',
  );
  const t = copy[language];
  const coreHeaderStatus = formatDNSCoreHeaderStatus(
    connection === 'ready'
      ? {
          state: 'ready',
          reportingAreas: master?.reportingAreas.length ?? 0,
          organizations: master?.organizations.length ?? 0,
        }
      : connection === 'error'
        ? { state: 'error' }
        : { state: 'loading' },
    language,
  );

  const effectiveAccess = developmentMode ? devAccessFor(devPersona) : access;

  useEffect(() => {
    let disposed = false;
    let activeDesignSystem = applyDNSDesignFallback();
    let disposeRuntime = initDNSUIRuntime(activeDesignSystem);

    void loadAndApplyDNSDesignSystem().then(({ designSystem }) => {
      if (disposed) return;
      if (dnsRuntimeSignature(designSystem) !== dnsRuntimeSignature(activeDesignSystem)) {
        disposeRuntime?.();
        disposeRuntime = initDNSUIRuntime(designSystem);
      }
      activeDesignSystem = designSystem;
    });

    return () => {
      disposed = true;
      disposeRuntime?.();
    };
  }, []);

  useEffect(() => {
    return subscribeToAuth((user) => {
      setAuthReady(false);
      setSalesRows([]);
      setAuthUser(user);
      setAccess(null);

      if (!user) {
        setAuthReady(true);
        return;
      }

      loadAccessContext(user.uid)
        .then((context) => {
          setAccess(context);
          if (context.profile?.preferredLanguage === 'de' || context.profile?.preferredLanguage === 'it') {
            setLanguage(context.profile.preferredLanguage);
          }
        })
        .catch((error) => {
          console.error('DNS authorization context failed', error);
          setAccess(null);
        })
        .finally(() => setAuthReady(true));
    });
  }, []);

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
    () => master?.seasons.find((season) => selectedSeasonId ? season.id === selectedSeasonId : season.status === 'active'),
    [master, selectedSeasonId],
  );

  const historicalSeason = activeSeason?.status === 'historical';

  useEffect(() => {
    setSalesRows([]);
    if (!master || !activeSeason) return;
    setPricingRows(createInitialPricingDraft(
            String(activeSeason.id),
            master.reportingAreas.map((area) => area.id),
          ),
    );
  }, [master, activeSeason]);

  useEffect(() => {
    let active = true;
    setPricingLoaded(false);
    if (historicalSeason || !activeSeason || !authReady || !effectiveAccess?.profile?.active || developmentMode) { setPricingBusy(false); return; }
    setPricingBusy(true);
    setPricingStatus('');
    loadPricing(String(activeSeason.id)).then((saved) => {
      if (!active) return;
      setPricingRows((current) => [...current.filter((row) => !saved.some((item) => item.id === row.id)), ...saved]);
      setPricingLoaded(true);
    }).catch((error) => { if (active) setPricingStatus(persistenceMessage(error, language)); })
      .finally(() => { if (active) setPricingBusy(false); });
    return () => { active = false; };
  }, [activeSeason?.id, authReady, effectiveAccess?.profile?.id, developmentMode]);

  function canManageTariff(row: PricingDraftRow) {
    if (historicalSeason) return false;
    return (developmentMode && devPersona === 'admin') || effectiveAccess?.isAdmin === true || (effectiveAccess?.grants ?? []).some((grant) =>
      grant.active && grant.permissions.includes('pricing.manage') &&
      ((grant.scopeType === 'network' && grant.scopeId === 'dolomiti-nordicski') ||
        (grant.scopeType === row.scopeType && grant.scopeId === row.scopeId)),
    );
  }

  async function persistPricing() {
    setPricingBusy(true);
    setPricingStatus('');
    try {
      const saved = await savePricing(pricingRows.filter(canManageTariff));
      setPricingRows((current) => [...current.filter((row) => !saved.some((item) => item.id === row.id)), ...saved]);
      setPricingStatus(language === 'de' ? 'In Firebase gespeichert' : 'Salvato in Firebase');
    } catch (error) {
      setPricingStatus(persistenceMessage(error, language));
    } finally { setPricingBusy(false); }
  }

  const effectivePermissions =
    effectiveAccess?.permissions ?? new Set<DNSPermission>();

  const allowedModules = useMemo(
    () =>
      modules.filter((module) =>
        effectivePermissions.has(MODULE_READ_PERMISSION[module.id]),
      ),
    [effectivePermissions],
  );

  useEffect(() => {
    if (!allowedModules.length) return;
    if (!allowedModules.some((module) => module.id === activeModule)) {
      setActiveModule(allowedModules[0].id);
    }
  }, [allowedModules, activeModule]);

  if (publicShareId) {
    return <PublicOrderSharePage shareId={publicShareId} />;
  }

  if (!authReady && !developmentMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dns-bg">
        <div className="dns-kicker">{t.authLoading}</div>
      </div>
    );
  }

  if (!authUser && !developmentMode) {
    return (
      <LoginScreen
        language={language}
        onLanguageChange={setLanguage}
        onDevelopmentMode={() => {
          sessionStorage.setItem('dns-development-mode', '1');
          sessionStorage.setItem('dns-dev-persona', 'admin');
          setDevPersona('admin');
          setDevelopmentMode(true);
        }}
      />
    );
  }

  const hasAccess =
    developmentMode ||
    (access?.profile?.active === true &&
      (access.isAdmin || access.permissions.size > 0));

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen flex-col bg-dns-bg">
        <header className="bg-dns-deep text-white">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3.5 md:px-8">
            <div className="dns-tool-header-brand">
              <img src={DNS_SHARED_BRAND.webLogoUrl} alt="Dolomiti NordicSki" className="h-10 w-auto" />
              <div className="text-[22px] uppercase tracking-[.035em]">
                <strong>DNS</strong> <span className="font-normal">DATA ENTRY</span>
              </div>
            </div>
            <button
              type="button"
              onClick={leaveSession}
              data-dns-press
              data-dns-hover
              className="border-0 border-b border-white/50 bg-transparent px-1 py-1 text-[10px] font-bold uppercase tracking-[.06em] text-white"
            >
              {developmentMode ? t.exitDev : t.signOut}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[760px] flex-1 px-5 py-12 md:px-8">
          <section className="dns-card p-6 md:p-8">
            <div className="dns-kicker">{authUser?.email ?? authUser?.uid}</div>
            <h1 className="mt-1 text-[26px] font-semibold">{t.noAccessTitle}</h1>
            <p className="mt-3 font-alt text-[12px] leading-relaxed text-dns-muted">
              {t.noAccess}
            </p>
          </section>
        </main>
      </div>
    );
  }

  const active =
    allowedModules.find((module) => module.id === activeModule) ??
    allowedModules[0];
  const activeDataContracts = dataContractsForModule(activeModule);
  const canManagePricing = effectivePermissions.has('pricing.manage');

  function leaveSession() {
    setSalesRows([]);
    if (developmentMode) {
      sessionStorage.removeItem('dns-development-mode');
      sessionStorage.removeItem('dns-dev-persona');
      setDevPersona('admin');
      setDevelopmentMode(false);
      return;
    }
    void dnsSignOut();
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-dns-bg"
      data-dns-data-contracts-version={DNS_DATA_CONTRACTS_VERSION}
      data-dns-active-contracts={activeDataContracts.map((contract) => contract.id).join(',')}
    >
      <header data-dns-tool-header id="dns-data-entry-header" className="bg-dns-deep text-white shadow-[0_1px_0_rgba(255,255,255,.08)]">
        <div className="dns-tool-header-shell">
          <div className="flex items-center gap-4">
            <img
              src={DNS_SHARED_BRAND.webLogoUrl}
              alt="Dolomiti NordicSki"
              className="dns-tool-header-logo"
            />
            <div className="dns-tool-header-identity">
              <div className="dns-tool-header-title">
                <strong>DNS</strong> <span className="font-normal">DATA ENTRY</span>
              </div>
              <div className="dns-tool-header-subtitle">
                {t.seasonalOps}
              </div>
            </div>
          </div>

          <div className="dns-tool-header-actions">
            <div className="dns-tool-header-account">
              <div className="font-alt text-[10px] text-white/75">
                {developmentMode
                  ? (devPersona === 'area-test' ? DEV_AREA_TEST_LABEL : t.devAdmin)
                  : (authUser?.email ?? authUser?.uid)}
              </div>
              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-dns-light">
                {developmentMode
                  ? (devPersona === 'area-test' ? t.devAreaScope : t.devMode)
                  : effectiveAccess?.isAdmin ? t.admin : t.scoped}
              </div>
            </div>

            <div className="dns-tool-header-controls">
              <AccessibilityMount language={language} />
              <div className="dns-tool-header-language">
              {(['de', 'it'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  data-dns-press
                  className={[
                    'border-0 border-b-2 bg-transparent px-1 py-1 text-white',
                    language === lang ? 'border-white' : 'border-transparent opacity-60',
                  ].join(' ')}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
              </div>
            </div>

            <button
              type="button"
              onClick={leaveSession}
              data-dns-press
              data-dns-hover
              className="dns-tool-header-session-action hover:text-white"
            >
              {developmentMode ? t.exitDev : t.signOut}
            </button>

            <div
              className="dns-tool-header-status"
              data-state={coreHeaderStatus.state}
              aria-live="polite"
            >
              <span className="dns-tool-header-status-dot" />
              {coreHeaderStatus.text}
            </div>
          </div>
        </div>
      </header>

      {developmentMode && (
        <div className="bg-amber-100 px-5 py-2 text-amber-900">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-3 font-alt text-[10px] font-bold uppercase tracking-[.08em]">
            <span>{t.devMode} · Frontend only · no production writes</span>
            <div className="inline-flex overflow-hidden rounded-md border border-amber-900/20 bg-white/70">
              {([
                ['admin', t.devAdmin],
                ['area-test', t.devArea],
              ] as const).map(([persona, label]) => (
                <button
                  key={persona}
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('dns-dev-persona', persona);
                    setDevPersona(persona);
                    if (persona === 'area-test') setActiveModule('orders');
                  }}
                  className={[
                    'px-3 py-1.5 transition',
                    devPersona === persona ? 'bg-amber-900 text-white' : 'text-amber-900',
                  ].join(' ')}
                  aria-pressed={devPersona === persona}
                >
                  {label}
                </button>
              ))}
            </div>
            {devPersona === 'area-test' && <span>{t.devAreaScope}</span>}
          </div>
        </div>
      )}

      <nav data-dns-tool-nav id="dns-data-entry-nav" className="dns-tab-nav" aria-label={t.operations}>
        <div className="dns-tab-nav-inner">
          {master && activeSeason && <SeasonSelector
            seasons={master.seasons
              .filter((season) => season.status === 'active' || ['2024-25', '2025-26'].includes(String(season.id)))
              .sort((a, b) => String(b.id).localeCompare(String(a.id)))}
            selectedSeasonId={String(activeSeason.id)}
            language={language}
            onChange={setSelectedSeasonId}
          />}
          {allowedModules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => setActiveModule(module.id)}
              data-dns-press
              className={[
                'dns-tab',
                activeModule === module.id ? 'dns-tab-active' : '',
              ].join(' ')}
              aria-current={activeModule === module.id ? 'page' : undefined}
            >
              {module.label[language]}
            </button>
          ))}
        </div>
      </nav>


      <div className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-5 md:px-8">
        <main className="space-y-5">
          <section className="dns-card p-5 md:p-6" data-dns-reveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="dns-kicker">{active.phase[language]}</div>
                <div className="mt-1 flex items-center gap-2.5">
                  <span className="text-dns-mid">
                    <WireIcon name={active.id} size={21} />
                  </span>
                  <h1 className="text-[27px] font-semibold tracking-[-.02em] text-dns-deep">
                    {active.label[language]}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeModule === 'pricing' && !canManagePricing && (
                  <span className="dns-pill">{t.readOnly}</span>
                )}
              </div>
            </div>
          </section>

          {historicalSeason && <HistoricalSeason seasonId={String(activeSeason.id)} module={activeModule} access={effectiveAccess} language={language} />}

          {!historicalSeason && activeModule === 'season' && (
            <div key="season" data-dns-reveal>
              <SeasonSetup language={language} season={activeSeason} />
            </div>
          )}

          {!historicalSeason && activeModule === 'pricing' && master && activeSeason && (
            <div key="pricing" data-dns-reveal>
              <PricingSetup
              language={language}
              seasonId={String(activeSeason.id)}
              reportingAreas={master.reportingAreas}
              organizations={master.organizations}
              rows={pricingRows}
              onChange={(rows) => { setPricingStatus(''); setPricingRows(rows); }}
              readOnly={!canManagePricing || pricingBusy}
              onSave={persistPricing} saving={pricingBusy}
              canSave={canManagePricing && pricingLoaded && !developmentMode}
              saveStatus={pricingStatus} canEditRow={canManageTariff}
            />
            </div>
          )}

          {!historicalSeason && activeModule === 'orders' && master && activeSeason && (
            <div key="orders" data-dns-reveal>
              <TicketOrdersTable
              language={language}
              seasonId={String(activeSeason.id)}
              canWrite={effectivePermissions.has('ticketOrders.write')}
              developmentMode={developmentMode}
              access={effectiveAccess}
              organizations={master.organizations}
              isAdmin={effectiveAccess?.isAdmin === true}
              devAreaTest={developmentMode && devPersona === 'area-test'}
              />
            </div>
          )}

          {!historicalSeason && activeModule === 'kp' && master && activeSeason && effectiveAccess && (
            <div key="kp" data-dns-reveal>
              <KPDataEntry
                seasonId={String(activeSeason.id)}
                language={language}
                master={master}
                access={effectiveAccess}
                canWrite={effectivePermissions.has('kp.write')}
                canVerify={effectivePermissions.has('kp.verify')}
                developmentMode={developmentMode}
              />
            </div>
          )}

          {!historicalSeason && activeModule === 'sales' && master && activeSeason && (
            <div key="sales" data-dns-reveal>
            <SalesEntry master={master} access={effectiveAccess} developmentMode={developmentMode}
              canWrite={effectivePermissions.has('ticketSales.write')} language={language}
              seasonId={String(activeSeason.id)} pricingRows={pricingRows}
              rows={salesRows} onChange={setSalesRows} pricingLoaded={pricingLoaded} />
            </div>
          )}

          {!historicalSeason && !['season', 'pricing', 'orders', 'sales', 'kp'].includes(activeModule) && (
            <div key={activeModule} data-dns-reveal className="space-y-5">
              <section className="dns-card p-6">
                <div className="dns-section-title">{active.label[language]}</div>
                <p className="mt-2 font-alt text-[12px] leading-relaxed text-dns-muted">
                  {t.moduleReady}
                </p>
              </section>

              <section className="dns-card p-5 md:p-6">
                <div className="dns-section-title">{t.dataFlow}</div>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  {t.flow.map((item, index) => (
                    <div
                      key={item}
                      data-dns-reveal
                      data-dns-reveal-index={index}
                      data-dns-reveal-stagger="compact"
                      className="relative rounded-lg border border-dns-mid/15 bg-dns-bg px-4 py-4 text-center"
                    >
                      <div className="text-[11px] font-bold uppercase tracking-[.05em]">
                        {item}
                      </div>
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
            </div>
          )}
        </main>
      </div>

      <footer className="mt-6 bg-dns-deep text-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="text-[11px] font-semibold uppercase tracking-[.05em] text-white/80">
            {t.footerMain}
          </div>
          <div className="font-alt text-[10px] uppercase tracking-[.04em] text-white/60">
            {t.footerSub} · Data Contracts v{DNS_DATA_CONTRACTS_VERSION} · © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
