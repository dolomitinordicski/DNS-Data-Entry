import type { CollectiveOrderLine } from './model';

export interface AllocationScope {
  /** Approved canonical organization IDs. */
  organizationIds: readonly string[];
  /** Explicitly approved payer substitutions, never inferred from reporting area. */
  payerAssignments?: Readonly<Record<string, readonly string[]>>;
}

export interface AllocationCheck {
  ok: boolean;
  errors: string[];
  totalQuantity: number;
  byOrderingOrganization: Record<string, number>;
  byBilledOrganization: Record<string, number>;
}

/** Checks organization allocations without computing subsidies or prices.
 * Authorization must also be independently enforced by Firestore rules.
 */
export function checkAllocations(lines: readonly CollectiveOrderLine[], scope: AllocationScope): AllocationCheck {
  const errors: string[] = [];
  const ids = new Set(scope.organizationIds);
  const byOrderingOrganization: Record<string, number> = {};
  const byBilledOrganization: Record<string, number> = {};
  const seen = new Set<string>();
  let totalQuantity = 0;
  for (const line of lines) {
    const {organizationId, billedOrganizationId, recipientOrganizationId} = line.participant;
    if (seen.has(line.id)) errors.push('duplicate-line:' + line.id);
    seen.add(line.id);
    for (const [role, id] of [['ordering', organizationId], ['payer', billedOrganizationId], ['recipient', recipientOrganizationId]]) {
      if (!ids.has(id)) errors.push('unknown-' + role + '-organization:' + line.id);
    }
    if (billedOrganizationId !== organizationId &&
        !(scope.payerAssignments?.[organizationId] ?? []).includes(billedOrganizationId)) {
      errors.push('payer-assignment-not-approved:' + line.id);
    }
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) {
      errors.push('invalid-quantity:' + line.id);
      continue;
    }
    totalQuantity += line.quantity;
    byOrderingOrganization[organizationId] = (byOrderingOrganization[organizationId] ?? 0) + line.quantity;
    byBilledOrganization[billedOrganizationId] = (byBilledOrganization[billedOrganizationId] ?? 0) + line.quantity;
  }
  if (!Number.isSafeInteger(totalQuantity)) errors.push('quantity-overflow');
  return {ok:errors.length===0,errors,totalQuantity,byOrderingOrganization,byBilledOrganization};
}
