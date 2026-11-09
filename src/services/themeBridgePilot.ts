/**
 * DNS Data Entry theme bridge readiness contract.
 * This file intentionally does not initialize a receiver while the pinned
 * Foundation v1.4.0 lacks the opt-in themeParentOrigin option.
 * Embedded presentation is not an authorization signal.
 */
export const DNS_THEME_PARENT_ORIGIN = 'https://dolomitinordicski.github.io' as const;

export function isDNSDataEntryEmbedded(rawSearch: string): boolean {
  return new URLSearchParams(rawSearch).get('embedded') === '1';
}

/** Future Foundation opt-in is allowed only for the DNS Pages embedded view. */
export function dataEntryThemeParentOrigin(rawSearch: string): string | undefined {
  return isDNSDataEntryEmbedded(rawSearch) ? DNS_THEME_PARENT_ORIGIN : undefined;
}
