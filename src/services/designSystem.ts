import type { DNSDesignSystem } from '@dolomitinordicski/dns-shared-data/design-system';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './dnsCore';
import { DNS_DESIGN_FALLBACK } from '../design/fallback';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

type DesignPayload = DeepPartial<DNSDesignSystem>;

function mergeDesignSystem(payload: DesignPayload = {}): DNSDesignSystem {
  return {
    ...DNS_DESIGN_FALLBACK,
    ...payload,
    colors: {
      ...DNS_DESIGN_FALLBACK.colors,
      ...(payload.colors ?? {}),
    },
    typography: {
      ...DNS_DESIGN_FALLBACK.typography,
      ...(payload.typography ?? {}),
    },
    shape: {
      ...DNS_DESIGN_FALLBACK.shape,
      ...(payload.shape ?? {}),
    },
    shadow: {
      ...DNS_DESIGN_FALLBACK.shadow,
      ...(payload.shadow ?? {}),
    },
    motion: {
      ...DNS_DESIGN_FALLBACK.motion,
      ...(payload.motion ?? {}),
      reveal: {
        ...DNS_DESIGN_FALLBACK.motion.reveal,
        ...(payload.motion?.reveal ?? {}),
      },
      stagger: {
        ...DNS_DESIGN_FALLBACK.motion.stagger,
        ...(payload.motion?.stagger ?? {}),
      },
      reducedMotion: {
        ...DNS_DESIGN_FALLBACK.motion.reducedMotion,
        ...(payload.motion?.reducedMotion ?? {}),
      },
    },
    interaction: {
      ...DNS_DESIGN_FALLBACK.interaction,
      ...(payload.interaction ?? {}),
      focusVisible: {
        ...DNS_DESIGN_FALLBACK.interaction.focusVisible,
        ...(payload.interaction?.focusVisible ?? {}),
      },
      hover: {
        ...DNS_DESIGN_FALLBACK.interaction.hover,
        ...(payload.interaction?.hover ?? {}),
      },
      press: {
        ...DNS_DESIGN_FALLBACK.interaction.press,
        ...(payload.interaction?.press ?? {}),
      },
      controls: {
        ...DNS_DESIGN_FALLBACK.interaction.controls,
        ...(payload.interaction?.controls ?? {}),
      },
      links: {
        ...DNS_DESIGN_FALLBACK.interaction.links,
        ...(payload.interaction?.links ?? {}),
      },
      tabs: {
        ...DNS_DESIGN_FALLBACK.interaction.tabs,
        ...(payload.interaction?.tabs ?? {}),
      },
      cards: {
        ...DNS_DESIGN_FALLBACK.interaction.cards,
        ...(payload.interaction?.cards ?? {}),
      },
    },
  } as DNSDesignSystem;
}

function applyVariables(designSystem: DNSDesignSystem) {
  const root = document.documentElement;
  const { colors, typography, shape, shadow, motion } = designSystem;

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

  root.style.setProperty('--dns-motion-fast', `${motion.fastMs}ms`);
  root.style.setProperty('--dns-motion-standard', `${motion.standardMs}ms`);
  root.style.setProperty('--dns-motion-reveal', `${motion.reveal.durationMs}ms`);
  root.style.setProperty('--dns-motion-easing', motion.easing);
}

export async function loadAndApplyDNSDesignSystem() {
  const fallback = mergeDesignSystem();
  applyVariables(fallback);

  try {
    const snapshot = await getDoc(doc(db, 'designSystem', 'current'));
    if (!snapshot.exists()) {
      return {
        source: 'fallback' as const,
        version: fallback.version,
        designSystem: fallback,
      };
    }

    const designSystem = mergeDesignSystem(snapshot.data() as DesignPayload);
    applyVariables(designSystem);

    return {
      source: 'dns-core' as const,
      version: designSystem.version,
      designSystem,
    };
  } catch (error) {
    console.warn('DNS Design System remote load failed; using local fallback.', error);
    return {
      source: 'fallback' as const,
      version: fallback.version,
      designSystem: fallback,
    };
  }
}
