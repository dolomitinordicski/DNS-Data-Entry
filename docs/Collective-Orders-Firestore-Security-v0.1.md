# Collective Orders Firestore security proposal v0.1

**Design only — not deployed.** Existing `ticketOrders`, `ticketOrderLines` and their access policies remain unchanged.

## Proposed resources (private DNS_Core)

- `collectiveOrders/{orderId}`: project-level metadata, supplier identity, status, season, revision and document references.
- `collectiveOrders/{orderId}/allocations/{allocationId}`: organization-scoped order lines, variant and quantity. Explicit `organizationId`, `billedOrganizationId`, `recipientOrganizationId`, `reportingAreaId` and a canonical owner scope.
- `collectiveOrders/{orderId}/supplierCosts/{costId}`: supplier amounts and source references, **DNS admin only**.
- No supplier invoice files, fiscal data or private amounts in the public shared-data repository.

## Authorization policy to implement and test in dns-shared-data

1. Unauthenticated and inactive users may not read or write any private collective-order documents.
2. Admin may create, read, update and approve, with strict schema validation and server-side audit fields.
3. Partner members can read only their own scoped allocation records; they cannot list the project-wide supplier costs or other organizations' allocations.
4. Partner members may update quantities only in their own draft allocations, before admin locking. They may not alter canonical identities, supplier costs, pricing, or contribution policy.
5. Network admin approval transitions `draft -> reviewed -> confirmed -> closed`; confirmed/closed records are immutable except via documented superseding revision controlled by admin.
6. A reporting-area grant must not silently authorize access to unrelated organizations or billed-party fields: every cross-organization read/write case needs an explicit tested rule.
7. A public supplier share must contain only a purpose-built redacted snapshot, never an unrestricted direct database read.
8. Immutable source-revision binding is required when Faktura creates a draft billing sheet; changed quantities must invalidate an unapproved downstream billing snapshot.
9. All critical authorization decisions must be enforced in Firestore rules or trusted backend, not merely in React.

## Emulator test matrix (required before any deployment)

| Actor | Draft own allocation | Other org allocation | Supplier total | Lock/confirm |
|---|---|---|---|---|
| unauthenticated | deny | deny | deny | deny |
| inactive profile | deny | deny | deny | deny |
| active unrelated partner | deny | deny | deny | deny |
| active scoped partner | own read/write quantity only | deny | deny | deny |
| reporting-area member | explicit approved scope only | deny unless explicitly scoped | deny | deny |
| DNS admin | allow | allow | allow | allow with schema & revision |
| revoked member | deny | deny | deny | deny |

Additional tests: non-existent canonical ID, spoofed billedOrganizationId, changed organizationId, deleted parent order, negative/fractional quantity, stale revision, partner writes after confirmation, and public-share exposure.

**Do not reuse `validOrder()` / `hasOrderPermission()` blindly.** Their category allowlist and permission names were designed specifically for ticket orders. Do not modify the production `firestore.rules` before emulator coverage exists.
