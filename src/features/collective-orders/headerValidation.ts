import type { CollectiveOrderStatus } from './model';
export type CollectiveOrderHeader = {
  id: string;
  seasonId: string;
  title: string;
  supplierId: string;
  status: CollectiveOrderStatus;
  sourceRevision: number;
  supplierDocumentIds: string[];
};
export function validHeaderInput(header: CollectiveOrderHeader): string[] {
  const errors: string[] = [];
  if (!header.id.trim() || !/^[a-z0-9][a-z0-9-]*$/.test(header.id)) errors.push('invalid-id');
  if (!header.seasonId.trim() || !header.title.trim() || !header.supplierId.trim()) errors.push('missing-required-field');
  if (!header.supplierDocumentIds.length || header.supplierDocumentIds.some(id=>!id.trim())) errors.push('missing-supplier-document');
  if (!Number.isSafeInteger(header.sourceRevision) || header.sourceRevision < 1) errors.push('invalid-revision');
  return errors;
}
export function validHeaderTransition(from: CollectiveOrderStatus, to: CollectiveOrderStatus): boolean {
  return (from === 'draft' && (to === 'draft' || to === 'reviewed'))
    || (from === 'reviewed' && (to === 'reviewed' || to === 'confirmed'))
    || (from === 'confirmed' && to === 'closed');
}
