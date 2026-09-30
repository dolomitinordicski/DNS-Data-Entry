export const DNS_SHARED_BRAND = {
  webLogoFile: 'logo-web.png',
  printLogoFile: 'logo.png',
  /**
   * Canonical files live in dns-shared-data/brand.
   * Keep the filename contract stable; the PNGs will be uploaded once.
   */
  webLogoUrl:
    'https://raw.githubusercontent.com/dolomitinordicski/dns-shared-data/main/brand/logo-web.png',
  printLogoUrl:
    'https://raw.githubusercontent.com/dolomitinordicski/dns-shared-data/main/brand/logo.png',
} as const;
