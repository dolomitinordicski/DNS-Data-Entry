import { FormEvent, useState } from 'react';
import { DNS_SHARED_BRAND } from '../../config/brand';
import { signIn } from '../../services/auth';
import { DNSFooter } from '../../components/DNSFooter';

type Language = 'de' | 'it';

const copy = {
  de: {
    title: 'DNS Data Entry',
    subtitle: 'Geschützter Zugang',
    email: 'E-Mail',
    password: 'Passwort',
    submit: 'Anmelden',
    pending: 'Anmeldung…',
    note: 'Der Zugang ist nur für freigeschaltete DNS-Benutzer vorgesehen.',
    error: 'Anmeldung nicht möglich. Bitte Zugangsdaten und Firebase-Authentifizierung prüfen.',
    devMode: 'Entwicklungsmodus',
    devNote: 'Frontend ohne Firebase-Login öffnen. Keine Firestore-Sicherheitsregel wird umgangen.',
  },
  it: {
    title: 'DNS Data Entry',
    subtitle: 'Accesso protetto',
    email: 'E-mail',
    password: 'Password',
    submit: 'Accedi',
    pending: 'Accesso…',
    note: 'L’accesso è riservato agli utenti DNS abilitati.',
    error: 'Accesso non riuscito. Verifica le credenziali e la configurazione Firebase Authentication.',
    devMode: 'Modalità sviluppo',
    devNote: 'Apre il frontend senza login Firebase. Non aggira alcuna regola di sicurezza Firestore.',
  },
} as const;

export function LoginScreen({
  language,
  onLanguageChange,
  onDevelopmentMode,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onDevelopmentMode: () => void;
}) {
  const t = copy[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      await signIn(email, password);
    } catch (reason) {
      console.error('DNS sign-in failed', reason);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-dns-bg">
      <header data-dns-tool-header className="bg-dns-deep text-white">
        <div className="dns-tool-header-shell">
          <div className="dns-tool-header-brand">
            <img src={DNS_SHARED_BRAND.webLogoUrl} alt="Dolomiti NordicSki" className="dns-tool-header-logo" />
            <div className="dns-tool-header-identity">
              <div className="dns-tool-header-title">
                <strong>DNS</strong> <span className="font-normal">DATA ENTRY</span>
              </div>
              <div className="dns-tool-header-subtitle">{t.subtitle}</div>
            </div>
          </div>
          <div className="dns-tool-header-actions">
            <div className="dns-tool-header-language">
              {(['de', 'it'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange(lang)}
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
        </div>
      </header>

      <main className="mx-auto flex max-w-[1440px] justify-center px-5 py-12 md:px-8 md:py-20">
        <section className="dns-card w-full max-w-[460px] p-6 md:p-8">
          <div className="dns-kicker">{t.subtitle}</div>
          <h1 className="mt-1 text-[28px] font-semibold text-dns-deep">{t.title}</h1>
          <p className="mt-2 font-alt text-[12px] leading-relaxed text-dns-muted">{t.note}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="dns-section-title">{t.email}</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2.5 font-alt text-[12px] outline-none focus:border-dns-mid"
              />
            </label>

            <label className="block">
              <span className="dns-section-title">{t.password}</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-dns-mid/20 bg-white px-3 py-2.5 font-alt text-[12px] outline-none focus:border-dns-mid"
              />
            </label>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-alt text-[11px] text-red-800">
                {t.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-dns-deep px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.06em] text-white transition hover:bg-dns-mid disabled:opacity-50"
            >
              {pending ? t.pending : t.submit}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-dns-mid/15" />
            <span className="font-alt text-[9px] uppercase tracking-[.06em] text-dns-muted">DEV</span>
            <div className="h-px flex-1 bg-dns-mid/15" />
          </div>

          <button
            type="button"
            onClick={onDevelopmentMode}
            className="w-full rounded-md border border-dns-mid/25 bg-dns-bg px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.06em] text-dns-deep transition hover:border-dns-mid/50"
          >
            {t.devMode}
          </button>
          <p className="mt-2 font-alt text-[10px] leading-relaxed text-dns-muted">
            {t.devNote}
          </p>
        </section>
      </main>
      <DNSFooter detail="Geschützter Zugang" />
    </div>
  );
}
