import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import logoUrl from '../logo1.png';
import { MODULE_READ_PERMISSION } from './config/access';
import { modules, type ModuleId } from './config/modules';
import { createInitialPricingDraft } from './config/pricing';
import { LoginScreen } from './features/auth/LoginScreen';
import { PricingSetup } from './features/pricing/PricingSetup';
import { TicketOrdersTable } from './features/orders/TicketOrdersTable';
import { SeasonSetup } from './features/season/SeasonSetup';
import {
  loadAccessContext,
  signOut as dnsSignOut,
  subscribeToAuth,
} from './services/auth';
import { loadDNSCoreMaster } from './services/dnsCore';
import { loadAndApplyDNSDesignSystem } from './services/designSystem';
import type { DNSAccessContext, DNSPermission } from './types/access';
import type { DNSCoreMaster } from './types/master';
import type { PricingDraftRow } from './types/pricing';

type ConnectionState = 'loading' | 'ready' | 'error';
type Language = 'de' | 'it';

const DEV_PERMISSIONS = new Set<DNSPermission>([
  'season.read',
  'season.manage',
  'pricing.read',
  'pricing.manage',
  'ticketOrders.read',
  'ticketOrders.write',
  'ticketOrders.verify',
  'ticketSales.read',
  'ticketSales.write',
  'ticketSales.verify',
  'kp.read',
  'kp.write',
  'kp.verify',
  'verification.read',
  'verification.manage',
]);

const copy = {
  de: {
    operations: 'Operations',
    seasonalOps: 'Saisonale Datenerfassung',
    connected: 'DNS_Core verbunden',
    unavailable: 'DNS_Core nicht erreichbar',
    connecting: 'DNS_Core verbindet…',
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
    exitDev: 'Dev-Modus verlassen',
  },
  it: {
    operations: 'Operazioni',
    seasonalOps: 'Raccolta dati stagionale',
    connected: 'DNS_Core connesso',
    unavailable: 'DNS_Core non raggiungibile',
    connecting: 'Connessione a DNS_Core…',
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
    exitDev: 'Esci dalla modalità sviluppo',
  },
} as const;

function App() {
  const [language, setLanguage] = useState<Language>('de');
  const [activeModule, setActiveModule] = useState<ModuleId>('season');
  const [master, setMaster] = useState<DNSCoreMaster | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('loading');
  const [pricingRows, setPricingRows] = useState<PricingDraftRow[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [access, setAccess] = useState<DNSAccessContext | null>(null);
  const [developmentMode, setDevelopmentMode] = useState(
    () => sessionStorage.getItem('dns-development-mode') === '1',
  );

  const t = copy[language];

  useEffect(() => {
    void loadAndApplyDNSDesignSystem();
  }, []);

  useEffect(() => {
    return subscribeToAuth((user) => {
      setAuthReady(false);
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
    () => master?.seasons.find((season) => season.status === 'active'),
    [master],
  );

  useEffect(() => {
    if (!master || !activeSeason) return;
    setPricingRows((current) =>
      current.length
        ? current
        : createInitialPricingDraft(
            String(activeSeason.id),
            master.reportingAreas.map((area) => area.id),
          ),
    );
  }, [master, activeSeason]);

  const effectivePermissions = developmentMode
    ? DEV_PERMISSIONS
    : (access?.permissions ?? new Set<DNSPermission>());

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
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt="Dolomiti NordicSki" className="h-10 w-auto" />
              <div className="text-[22px] uppercase tracking-[.035em]">
                <strong>DNS</strong> <span className="font-normal">DATA ENTRY</span>
              </div>
            </div>
            <button
              type="button"
              onClick={leaveSession}
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
  const canManagePricing = effectivePermissions.has('pricing.manage');

  function leaveSession() {
    if (developmentMode) {
      sessionStorage.removeItem('dns-development-mode');
      setDevelopmentMode(false);
      return;
    }
    void dnsSignOut();
  }

  return (
    <div className="flex min-h-screen flex-col bg-dns-bg">
      <header className="sticky top-0 z-30 bg-dns-deep text-white shadow-[0_1px_0_rgba(255,255,255,.08)]">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-5 py-3.5 md:px-8">
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
            <div className="hidden text-right md:block">
              <div className="font-alt text-[10px] text-white/75">
                {developmentMode ? t.devMode : (authUser?.email ?? authUser?.uid)}
              </div>
              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-dns-light">
                {developmentMode ? t.devMode : access?.isAdmin ? t.admin : t.scoped}
              </div>
            </div>

            <div className="flex gap-3 text-[10px] font-bold uppercase tracking-[.06em]">
              {(['de', 'it'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={[
                    'border-0 border-b-2 bg-transparent px-1 py-1 text-white transition',
                    language === lang ? 'border-white' : 'border-transparent opacity-60',
                  ].join(' ')}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={leaveSession}
              className="border-0 border-b border-white/50 bg-transparent px-1 py-1 text-[10px] font-bold uppercase tracking-[.06em] text-white/80 hover:text-white"
            >
              {developmentMode ? t.exitDev : t.signOut}
            </button>

            <div
              className={[
                'hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[.05em] xl:flex',
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

      {developmentMode && (
        <div className="bg-amber-100 px-5 py-2 text-center font-alt text-[10px] font-bold uppercase tracking-[.08em] text-amber-900">
          {t.devMode} · Frontend only · Firebase rules remain enforced
        </div>
      )}

      <nav className="dns-tab-nav" aria-label={t.operations}>
        <div className="dns-tab-nav-inner">
          <div className="dns-tab-season">
            WS {String(activeSeason?.id ?? '2026-27')}
          </div>
          {allowedModules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => setActiveModule(module.id)}
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
          <section className="dns-card p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="dns-kicker">{active.phase[language]}</div>
                <h1 className="mt-1 text-[27px] font-semibold tracking-[-.02em] text-dns-deep">
                  {active.label[language]}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeModule === 'pricing' && !canManagePricing && (
                  <span className="dns-pill">{t.readOnly}</span>
                )}
                <span className="dns-pill">
                  {activeSeason ? `${t.activeSeason} · ${activeSeason.id}` : t.loadingSeason}
                </span>
              </div>
            </div>
          </section>

          {activeModule === 'season' && (
            <SeasonSetup language={language} season={activeSeason} />
          )}

          {activeModule === 'pricing' && master && activeSeason && (
            <PricingSetup
              language={language}
              seasonId={String(activeSeason.id)}
              reportingAreas={master.reportingAreas}
              organizations={master.organizations}
              rows={pricingRows}
              onChange={setPricingRows}
              readOnly={!canManagePricing}
            />
          )}

          {activeModule === 'orders' && master && activeSeason && (
            <TicketOrdersTable
              language={language}
              seasonId={String(activeSeason.id)}
              canWrite={effectivePermissions.has('ticketOrders.write')}
              developmentMode={developmentMode}
              access={access}
              organizations={master.organizations}
            />
          )}

          {!['season', 'pricing', 'orders'].includes(activeModule) && (
            <>
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
            </>
          )}
        </main>
      </div>

      <footer className="mt-6 bg-dns-deep text-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="text-[11px] font-semibold uppercase tracking-[.05em] text-white/80">
            {t.footerMain}
          </div>
          <div className="font-alt text-[10px] uppercase tracking-[.04em] text-white/60">
            {t.footerSub} · © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
