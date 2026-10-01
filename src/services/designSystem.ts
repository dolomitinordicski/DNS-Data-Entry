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
    navigation: {
      ...DNS_DESIGN_FALLBACK.navigation,
      ...(payload.navigation ?? {}),
      tabs: {
        ...DNS_DESIGN_FALLBACK.navigation.tabs,
        ...(payload.navigation?.tabs ?? {}),
        scrollProgress: {
          ...DNS_DESIGN_FALLBACK.navigation.tabs.scrollProgress,
          ...(payload.navigation?.tabs?.scrollProgress ?? {}),
        },
      },
    },
  } as DNSDesignSystem;
}

function applyVariables(designSystem: DNSDesignSystem) {
  const root = document.documentElement;
  const { colors, typography, shape, shadow, motion, contextSelector, navigation } = designSystem;

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

  root.style.setProperty('--dns-context-selected-bg', contextSelector.selected.background);
  root.style.setProperty('--dns-context-selected-text', contextSelector.selected.text);
  root.style.setProperty('--dns-context-selected-border', contextSelector.selected.border);
  root.style.setProperty('--dns-context-hover-bg', contextSelector.hover.background);
  root.style.setProperty('--dns-context-hover-border', contextSelector.hover.border);
  root.style.setProperty('--dns-context-focus-color', contextSelector.focus.color);
  root.style.setProperty('--dns-context-focus-width', `${contextSelector.focus.widthPx}px`);
  root.style.setProperty('--dns-context-focus-offset', `${contextSelector.focus.offsetPx}px`);

  root.style.setProperty('--dns-tab-bg', navigation.tabs.containerBackground);
  root.style.setProperty('--dns-tab-text', navigation.tabs.textColor);
  root.style.setProperty('--dns-tab-active', navigation.tabs.activeTextColor);
  root.style.setProperty('--dns-tab-hover', navigation.tabs.hoverTextColor);
  root.style.setProperty('--dns-tab-indicator', navigation.tabs.activeIndicatorColor);
  root.style.setProperty('--dns-tab-indicator-width', `${navigation.tabs.activeIndicatorWidthPx}px`);
  root.style.setProperty('--dns-tab-size', `${navigation.tabs.fontSizePx}px`);
  root.style.setProperty('--dns-tab-weight', String(navigation.tabs.fontWeight));
  root.style.setProperty('--dns-tab-tracking', `${navigation.tabs.letterSpacingEm}em`);
  root.style.setProperty('--dns-nav-surface-bg', navigation.tabs.surfaceBackground);
  root.style.setProperty('--dns-nav-backdrop-blur', `${navigation.tabs.backdropBlurPx}px`);
  root.style.setProperty('--dns-scroll-progress-height', `${navigation.tabs.scrollProgress.heightPx}px`);
  root.style.setProperty('--dns-scroll-progress-color', navigation.tabs.scrollProgress.color);
  root.style.setProperty('--dns-scroll-progress-track', navigation.tabs.scrollProgress.track);
}

export function applyDNSDesignFallback(): DNSDesignSystem {
  const fallback = mergeDesignSystem();
  applyVariables(fallback);
  return fallback;
}

export function dnsRuntimeSignature(designSystem: DNSDesignSystem) {
  return JSON.stringify({
    motion: designSystem.motion,
    interaction: designSystem.interaction,
  });
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
    if (designSystem.version !== fallback.version) applyVariables(designSystem);

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
