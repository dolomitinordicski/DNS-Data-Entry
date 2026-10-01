# DNS Data Entry

Seasonal operations and data-entry application for Dolomiti NordicSki.

## Firebase seasonal persistence

Tariffs use `ticketPricingConfigs`; sales use `ticketSales`. Authenticated users explicitly save from the form. Development mode never writes. Save tariff configuration before saving sales; sales snapshot the persisted prices and reject stale pricing. Draft saves retain the previous document in an immutable `revisions` subcollection. Optimistic revision checks reject concurrent edits. Verified/submitted records cannot be edited with the draft form.

Saves are transactions per row; a multi-row save can stop after earlier rows succeeded. Retrying unchanged values is idempotent. A missing quantity remains unreported; use zero for no sales. Saved values cannot be silently cleared. The user must reload after a concurrent-edit conflict.

Rules and reproducible emulator tests live in `dns-shared-data` (`npm run test:rules`, Node 22 + Java 17). The shared repository's existing Firebase deploy workflow publishes the rules to `dns-core`.
