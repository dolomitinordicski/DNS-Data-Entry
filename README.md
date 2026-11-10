# DNS Data Entry

Seasonal operations and data-entry application for Dolomiti NordicSki.

## Firebase seasonal persistence

Tariffs use `ticketPricingConfigs`; sales use `ticketSales`. Authenticated users explicitly save from the form. Development mode never writes. Save tariff configuration before saving sales; sales snapshot the persisted prices and reject stale pricing. Draft saves retain the previous document in an immutable `revisions` subcollection. Optimistic revision checks reject concurrent edits. Verified/submitted records cannot be edited with the draft form.

Saves are transactions per row; a multi-row save can stop after earlier rows succeeded. Retrying unchanged values is idempotent. A missing quantity remains unreported; use zero for no sales. Saved values cannot be silently cleared. The user must reload after a concurrent-edit conflict.

Rules and reproducible emulator tests live in `dns-shared-data` (`npm run test:rules`, Node 22 + Java 17). The shared repository's existing Firebase deploy workflow publishes the rules to `dns-core`.


## Shared Foundation

DNS Data Entry consumes the immutable `foundation-v1.2.0` release of `@dolomitinordicski/dns-shared-data`. The Foundation runtime initializes before React renders and supplies the design tokens, shared UI primitives, navigation, accessibility, and print runtime.

DNS Core remains the source for operational master data, permissions, organization and area context, and Firestore-backed records. Order catalogs, forms, delivery locations, and persisted KP data continue to use the existing Core services and collections. Foundation supplies only the canonical seasonal setup defaults where Core configuration is absent.

Data Entry keeps its local order, pricing, sales, KP, and permissions workflows, including seasonal navigation and its specialized print layout. Those application features are unchanged by this migration.

The application exposes the active shared Data Contract IDs on the authorized shell for diagnostics and migration checks.



### Accessibility v1

DNS Data Entry mounts the shared Foundation accessibility runtime from `@dolomitinordicski/dns-shared-data/ui/accessibility` in the authenticated application header. Preferences use the common `dns-accessibility-v1` local browser key and are not written to Firebase.


### Canonical navigation runtime

DNS Data Entry uses `@dolomitinordicski/dns-shared-data/ui/navigation` for sticky metrics, scroll progress and responsive navigation geometry. The application only owns module selection and labels; structural navigation behavior must remain Foundation-owned.

## Digital Pass: official numbering source

The full persisted ticket matrix in DNS Core is the authoritative inventory: orderFormConfigs, orderCatalogItems, ticketOrders, ticketOrderLines and canonical organizations. Digital Pass [Shared Data PR #276](https://github.com/dolomitinordicski/dns-shared-data/pull/276) adds direct server-side reading of these same records; no separate inventory import or second approval of the official assignments is required.

Numbering follows catalogue displayOrder and then the form's organizationIds, across all products. Digital Pass pins the revision and the start number used for physical printing. Later quantity changes must not silently reassign already printed numbers. The backend reads the global matrix and then enforces organization scope; it must not renumber a single area's filtered subset.

The existing JSON export is an optional numbering export, not the activation source in data-entry mode. Its legacy approved:false field never authorizes sale, registration or cloud writes. The start-number field is currently UI state, restored from a published share where present: deployment configuration must match the actual printed start number.

This integration does not change order saving, physical numbering, sales, roles or Firebase configuration. Cloud activation remains a separately authorized release.
