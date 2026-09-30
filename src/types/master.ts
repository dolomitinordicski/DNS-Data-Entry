export type MasterCollectionName =
  | 'reportingAreas'
  | 'destinations'
  | 'organizations'
  | 'organizationRelationships'
  | 'seasons';

export interface CanonicalRecord {
  id: string;
  canonicalId?: string;
  canonicalName?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface DNSCoreMaster {
  reportingAreas: CanonicalRecord[];
  destinations: CanonicalRecord[];
  organizations: CanonicalRecord[];
  organizationRelationships: CanonicalRecord[];
  seasons: CanonicalRecord[];
}
