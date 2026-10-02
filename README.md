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
