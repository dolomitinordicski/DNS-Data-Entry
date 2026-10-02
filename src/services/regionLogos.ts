import {
  findRegionLogosForEntity,
  type DNSBrandEntityType,
  type DNSRegionLogoAsset,
} from '@dolomitinordicski/dns-shared-data/brand-assets';

export type LogoEntityType = DNSBrandEntityType;
export type RegionLogo = DNSRegionLogoAsset;

export const REGION_LOGO_MANIFEST_URL =
  'https://raw.githubusercontent.com/dolomitinordicski/dns-shared-data/release/v1.1.2/brand/regions/manifest.json';

let manifestPromise: Promise<RegionLogo[]> | undefined;

export function loadRegionLogos(): Promise<RegionLogo[]> {
  return manifestPromise ??= fetch(REGION_LOGO_MANIFEST_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Logo manifest: ${response.status}`);
      const manifest = await response.json();
      if (!Array.isArray(manifest.assets)) throw new Error('Invalid logo manifest');
      return manifest.assets.filter((asset: RegionLogo) =>
        typeof asset.id === 'string' &&
        typeof asset.label === 'string' &&
        typeof asset.filename === 'string' &&
        /^[a-z0-9-]+\.svg$/.test(asset.filename) &&
        Array.isArray(asset.entityBindings),
      );
    });
}

export function findRegionLogos(
  assets: readonly RegionLogo[],
  entityType: LogoEntityType,
  entityId: string,
) {
  const matches = findRegionLogosForEntity(assets, entityType, entityId);
  const primary = matches.filter((asset) => asset.priority !== 'secondary');
  return primary.length ? primary : matches;
}

export function regionLogoUrl(asset: Pick<RegionLogo, 'filename'>) {
  return new URL(asset.filename, REGION_LOGO_MANIFEST_URL).href;
}
