import type { CanonicalRecord } from '../../types/master';

type Language = 'de' | 'it';

const text = {
  de: {
    title: 'Saison-Setup',
    intro: 'Auswahl und Kontrolle der Saisonbasis. Die Saison stammt aus DNS_Core und bleibt die Referenz für Tarife, Bestellungen, Verkäufe und KP.',
    current: 'Aktive Saison',
    status: 'Status',
    source: 'Quelle',
    pricingState: 'Tarifstatus',
    draft: 'Entwurf',
    note: 'In v0.1 wird die Saison gelesen, aber noch nicht im Browser geändert oder veröffentlicht.',
  },
  it: {
    title: 'Setup stagione',
    intro: 'Selezione e controllo della base stagionale. La stagione proviene da DNS_Core e resta il riferimento per tariffe, ordini, vendite e KP.',
    current: 'Stagione attiva',
    status: 'Stato',
    source: 'Fonte',
    pricingState: 'Stato tariffe',
    draft: 'Bozza',
    note: 'Nella v0.1 la stagione viene letta, ma non viene ancora modificata o pubblicata dal browser.',
  },
} as const;

export function SeasonSetup({ language, season }: { language: Language; season?: CanonicalRecord }) {
  const t = text[language];

  return (
    <div className="space-y-5">
      <section className="dns-card p-5 md:p-6">
        <div className="dns-kicker">{t.current}</div>
        <h2 className="mt-1 text-[28px] font-semibold">WS {String(season?.id ?? '—')}</h2>
        <p className="mt-2 max-w-3xl font-alt text-[12px] leading-relaxed text-dns-muted">{t.intro}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="dns-card border-t-[3px] border-t-dns-light p-5">
          <div className="dns-kicker">{t.status}</div>
          <div className="mt-2 text-[18px] font-bold">{String(season?.status ?? '—')}</div>
        </div>
        <div className="dns-card border-t-[3px] border-t-dns-light p-5">
          <div className="dns-kicker">{t.source}</div>
          <div className="mt-2 text-[18px] font-bold">DNS_Core</div>
        </div>
        <div className="dns-card border-t-[3px] border-t-dns-light p-5">
          <div className="dns-kicker">{t.pricingState}</div>
          <div className="mt-2 text-[18px] font-bold">{t.draft}</div>
        </div>
      </section>

      <section className="dns-card p-5">
        <p className="font-alt text-[11px] leading-relaxed text-dns-muted">{t.note}</p>
      </section>
    </div>
  );
}
