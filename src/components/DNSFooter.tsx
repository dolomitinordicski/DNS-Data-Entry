import { DNS_FOUNDATION_RELEASE_VERSION } from '@dolomitinordicski/dns-shared-data/release';

export function DNSFooter({
  tool = 'DNS DATA ENTRY',
  detail = 'DNS_Core',
}: {
  tool?: string;
  detail?: string;
}) {
  return (
    <footer
      data-dns-tool-footer
      className="mt-6 bg-dns-deep text-white"
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] flex-col justify-center gap-1 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="text-[11px] font-semibold uppercase tracking-[.05em] text-white/80">
          Dolomiti NordicSki
        </div>
        <div className="max-w-[calc(100%-210px)] font-alt text-[10px] uppercase tracking-[.04em] text-white/60">
          {tool} · {detail} · Foundation v{DNS_FOUNDATION_RELEASE_VERSION} · © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
