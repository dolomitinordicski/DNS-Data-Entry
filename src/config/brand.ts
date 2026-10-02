import { DNS_FOUNDATION_RELEASE_VERSION } from '@dolomitinordicski/dns-shared-data/release';

const foundationAssets = `https://raw.githubusercontent.com/dolomitinordicski/dns-shared-data/foundation-v${DNS_FOUNDATION_RELEASE_VERSION}/brand`;

export const DNS_SHARED_BRAND = {
  webLogoFile: 'logo-web.png',
  printLogoFile: 'logo.png',
  webLogoUrl: `${foundationAssets}/logo-web.png`,
  printLogoUrl: `${foundationAssets}/logo.png`,
} as const;
