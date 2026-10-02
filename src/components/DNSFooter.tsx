import { DNS_FOUNDATION_RELEASE_VERSION } from '@dolomitinordicski/dns-shared-data/release';

export function DNSFooter({
  tool = 'DNS DATA ENTRY',
  detail = 'DNS_Core',
}: {
  tool?: string;
  detail?: string;
}) {
  return (
    <footer data-dns-tool-footer className="mt-6">
      <div className="dns-tool-footer-shell">
        <div className="dns-tool-footer-primary">
          Dolomiti NordicSki
        </div>
        <div className="dns-tool-footer-meta">
          {tool} · {detail} · Foundation v{DNS_FOUNDATION_RELEASE_VERSION} · © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
