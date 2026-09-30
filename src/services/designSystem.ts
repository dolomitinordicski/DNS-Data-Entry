import { doc, getDoc } from 'firebase/firestore';
import { db } from './dnsCore';
import { DNS_DESIGN_FALLBACK } from '../design/fallback';

type DesignPayload = {
  version?: string;
  colors?: Partial<typeof DNS_DESIGN_FALLBACK.colors>;
  typography?: Partial<typeof DNS_DESIGN_FALLBACK.typography>;
  shape?: Partial<typeof DNS_DESIGN_FALLBACK.shape>;
  shadow?: Partial<typeof DNS_DESIGN_FALLBACK.shadow>;
};

function applyVariables(payload: DesignPayload) {
  const root = document.documentElement;

  const colors = { ...DNS_DESIGN_FALLBACK.colors, ...(payload.colors ?? {}) };
  const typography = { ...DNS_DESIGN_FALLBACK.typography, ...(payload.typography ?? {}) };
  const shape = { ...DNS_DESIGN_FALLBACK.shape, ...(payload.shape ?? {}) };
  const shadow = { ...DNS_DESIGN_FALLBACK.shadow, ...(payload.shadow ?? {}) };

  root.style.setProperty('--color-dns-deep', colors.deep);
  root.style.setProperty('--color-dns-mid', colors.mid);
  root.style.setProperty('--color-dns-light', colors.light);
  root.style.setProperty('--color-dns-bg', colors.background);
  root.style.setProperty('--color-dns-surface', colors.surface);
  root.style.setProperty('--color-dns-muted', colors.mutedText);

  root.style.setProperty('--font-display', `"${typography.primaryFamily}", sans-serif`);
  root.style.setProperty('--font-alt', `"${typography.secondaryFamily}", sans-serif`);

  root.style.setProperty('--dns-card-radius', `${shape.cardRadiusPx}px`);
  root.style.setProperty('--dns-control-radius', `${shape.controlRadiusPx}px`);
  root.style.setProperty('--dns-card-shadow', shadow.card);
  root.style.setProperty('--dns-header-shadow', shadow.header);
}

export async function loadAndApplyDNSDesignSystem() {
  applyVariables(DNS_DESIGN_FALLBACK);

  try {
    const snapshot = await getDoc(doc(db, 'designSystem', 'current'));
    if (!snapshot.exists()) {
      return { source: 'fallback' as const, version: DNS_DESIGN_FALLBACK.version };
    }

    const payload = snapshot.data() as DesignPayload;
    applyVariables(payload);

    return {
      source: 'dns-core' as const,
      version: payload.version ?? DNS_DESIGN_FALLBACK.version,
    };
  } catch (error) {
    console.warn('DNS Design System remote load failed; using local fallback.', error);
    return { source: 'fallback' as const, version: DNS_DESIGN_FALLBACK.version };
  }
}
