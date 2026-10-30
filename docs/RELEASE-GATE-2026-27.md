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
