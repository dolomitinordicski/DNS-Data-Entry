# Data Entry 2026/27 — release gate (6 November 2026)

## Scope frozen for go-live
1. Pricing: verify existing ticketPricingConfigs forms, defaults, reporting-area visibility, save/reload, revisions.
2. Track quality / seasonal opening report: create 2026/27 entry form based on the field structure of the **2025/26** reference spreadsheet. Do **not** import old values. Preserve separation between seasonal declarations and automated daily track-km history.
3. Ticket sales: verify ticketSales organization/area/season scope, price snapshots, quantities (blank ≠ zero), revenue overrides, save/reload and conflicts.
4. KP: verify 2026/27 KP milestone forms and persistence; no historic import now.

## Identity boundary — parallel Work testing
- Identity/permissions and shared Firestore rules are owned by the parallel Identity workstream.
- This branch MUST NOT edit DNS Identity, shared-data security rules, production Firebase configuration or production data.
- No production deploy, merge to main, or permission-schema assumptions before Identity integration checks.
- Production Data Entry must authenticate via DNS Identity. DEV personas and bypasses must be removed **after** Identity integration is ready. Emulator fixtures remain acceptable for isolated tests.
- Role/source of truth: organization and tool-level read/write/none permissions from Firestore, enforced server-side. Never infer permission from a client area selector.
- Test concurrent sessions and a virtual testing organization without cross-area reads/writes.

## Acceptance per module
- Authenticated area user sees only their entitled organization/area/season.
- Authorized write persists on Firebase; read-only user cannot write; denied user cannot read.
- Save, logout, login and reload reproduce saved values.
- Validation, revisions and concurrency conflicts behave correctly.
- Errors are surfaced, no silent discard or unintended production writes.
- Existing ordering, printing and export functionality does not regress.

## Daily km comparison (post-launch)
- Shared Data automatic daily opened/groomed km snapshots are an independent comparison series.
- Do not duplicate live km history into seasonal declarations or KP.
- Historical spreadsheet and KP imports and comparative Analytics are deferred until after go-live.

## Findings on 30 October
- App.tsx still contains DEV MODE / devPersona bypass and session storage flags.
- SalesEntry and KPDataEntry still accept developmentMode props.
- PricingSetup and seasonalPersistence use ticketPricingConfigs; SalesEntry uses ticketSales.
- KPDataEntry reads/saves milestones via services/kp and shared kp-setup-2026-27.
- modules.ts contains season/pricing/orders/sales/kp/verification but **no separate track-quality module**; locate existing implementation elsewhere before adding one.
- package.json pins Foundation 1.2.1 while README references 1.2.0. Defer updating to avoid conflict with Foundation work.
- Workstream release date is 2026-11-06; do not scope-creep into Sammelbestellungen/Faktura.

## Cross-workstream audit — 2 November 2026
- Data Entry #75: TypeScript/Vite Build green at `fb467404`; not merged. DEV persona bypass is absent from this feature branch but remains on `main`.
- Shared Data #231: six existing + dedicated track-quality emulator workflows green at `aa65daa`; no merge. Its rules affect shared dns-core, so do not deploy independently of other identity/security changes.
- Flyer Studio #70: concurrent Identity/area-scoped work continues; latest observed commit `57e2d01` had CI pending. Do not modify or merge this branch from Data Entry.
- Shared Data #221: flyer.read/flyer.write enforcement is still open and requires cross-app approval and isolation testing. Do not merge conflicting firestore.rules without reviewing both #221 and #231.
- Shared Data #210: package icon catalog has green checks but is draft; leave it for its owner. Data Entry #70 (collective orders) outside 6 November release scope.
- **Merge gate remains closed** until integration demonstrates W/R/none + saved/reloaded records through the real front-end, simultaneous sessions, cross-organization denial, and no bypass on deployed Data Entry.
- Check parallel GitHub PRs and recent workstream decisions before every subsequent DNS edit or merge; don't rely on an older green commit if the PR head changed.

## Acceptance walkthrough — isolated Identity test organization
Run only against Firebase Emulator / isolated staging, never against live season data.
Use the existing synthetic area `dns-test-area` and three distinct authorization profiles; one operator at a time per organization.

1. **Login:** password-based DNS Identity only; no DEV login, DEV persona or test toggle in deployed UI. Confirm inactive/unauthorized users cannot enter protected modules.
2. **Prices:** W user saves a changed regional tariff, signs out, signs back in and verifies the same value; R cannot save and none cannot access. Verify area-specific overrides never change another organization.
3. **Qualitätskontrolle:** W creates one synthetic track and records partial kilometres; reload and sign-in reproduce it. R can view but cannot save; none is denied. An out-of-area record must not be visible.
4. **Sales:** save one synthetic quantity 0 and one nonzero quantity; verify blank remains distinct from zero, pricing snapshot and totals persist. Correct a previously saved amount, reload and confirm new value; R and none must be blocked.
5. **KP:** save one test milestone and organization entry, reload and confirm values; R/none denied for updates. Confirm historical-season entries remain locked.
6. **Release boundary:** inspect GitHub CI on exact merge SHAs. Merge Shared Data security changes only after coordinating the overlapping Flyer Studio #221 rules. Deploy and smoke-test through Workspace Identity before enabling area accounts. Record test evidence and outcomes here before final go/no-go.

Not completed by a green compilation alone: end-to-end sign-out/sign-in, Firebase persistence and W/R/none must be observed against the test backend.
