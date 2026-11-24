# Roadmap and handoff

The active queue is the [Lyfe Work/Tickets database](https://app.notion.com/p/3c135ab73db380f29231df07b4263bab?pvs=204). The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) governs the MVP.

## Current objective

Establish the approved Expo app foundation, then follow the Notion ticket dependencies for data, security, and features.

## Current state

- The frozen architecture approves the production stack and MVP scope.
- Ticket L—3's Expo Router navigation skeleton with strict TypeScript is merged.
- Ticket L—4's app quality gates are merged: Prettier, Expo ESLint, Jest unit tests, TypeScript, and native bundle checks in CI.
- Ticket L—5's Supabase client configuration, email/password authentication, secure session storage, route guards, and profile migration are merged. The existing Free-plan Supabase project **Lyfe App** (`cwyzeokzjbvfalvmqnhx`) is designated for development. Migration `20261115210000_profiles_auth` was applied there on 2026-11-16; a follow-up CLI dry run found no pending migrations.
- Ticket L—6's migration and local SQL tests were merged in [PR #6](https://github.com/jedipeter12/lyfeapp/pull/6) on 2026-11-17. The owner-approved restricted individual deletion policy is recorded in `DECISIONS.md`. Migration `20261118041954_baseline_tables` was applied to the Lyfe development project on 2026-11-17; a CLI dry run found no pending migrations. Hosted inspection found all 16 baseline tables with RLS and no authenticated `DELETE` privilege.
- Ticket L—8's typed repository and query-cache foundation was merged in [PR #7](https://github.com/jedipeter12/lyfeapp/pull/7) on 2026-11-18. Account is its first screen integration; task, pet, and vehicle UI remains in later tickets.
- Ticket L—9's accessible light/dark app shell and shared controls were merged in [PR #11](https://github.com/jedipeter12/lyfeapp/pull/11). Auth, account, and placeholder screens use the shared theme and loading/empty/error components. Device accessibility review remains outstanding.
- Ticket L—10's custom-field client schemas, owner/module-checked repositories, query hooks, and local SQL coverage were merged in [PR #12](https://github.com/jedipeter12/lyfeapp/pull/12). The baseline database schema already supplies server-side value and ownership enforcement. Module screens do not yet expose custom fields.
- Ticket L—7's adversarial local SQL test was merged in [PR #13](https://github.com/jedipeter12/lyfeapp/pull/13). It covers read isolation on all 16 tables and cross-user relationship rejection.
- Ticket L—12's task list and editor support creation, editing, completion/reopen, server-side pending/completed filters, due date/time, priority, and one optional pet or vehicle link. Unit, screen-flow, and disposable-database SQL tests pass. Native device and hosted app flows remain unverified; recurrence, reminders, and soft-delete UI are separate work.
- Ticket L—13's L—12 prerequisite is merged in [PR #16](https://github.com/jedipeter12/lyfeapp/pull/16). The owner accepted [ADR-003](decisions/ADR-003-recurrence-occurrence-persistence.md) on 2026-11-20. The implementation branch adds local calendar recurrence, owner-scoped occurrence history, transactional completion, task-screen repeat controls, and tests. The migration and synthetic SQL test pass in a disposable local PostgreSQL container; hosted migration and app/device flows remain unverified and require separate approval.
- Ticket L—17's vehicle screen now supports profile create/read/edit, optional normalized VIN, current mileage editing, and paged mileage history. Repository ownership checks and focused tests are in place. The owner accepted [ADR-006](decisions/ADR-006-vehicle-deletion.md) on 2026-11-24, retaining the L—6 individual vehicle deletion restriction for launch. Native and hosted app flows remain unverified.
- The owner accepted [ADR-002](decisions/ADR-002-attachment-deletion.md) on 2026-11-19, allowing owner deletion of attachment metadata and private files only. L—11 migration, Storage policies, client adapter, and tests were merged in [PR #14](https://github.com/jedipeter12/lyfeapp/pull/14). The owner approved applying migration `20261119205740_l11_private_attachments` to the **development** Supabase project; it was applied on 2026-11-20 UTC. Hosted inspection verified the private bucket, 10 MiB and MIME limits, owner-path policies, attachment DELETE grant, continued denial of task and pet DELETE, and no existing attachment or bucket-object rows. A CLI dry run found no pending migrations. Direct hosted Auth, Data, and Storage API checks passed with two temporary confirmed synthetic users; cleanup was verified. App adapter and device flows remain unverified.
- The owner approved task-only soft deletion in `docs/decisions/ADR-001-task-soft-delete.md` on 2026-11-18. The additive migration, SQL test, and repository filter/mark/restore methods were merged in [PR #8](https://github.com/jedipeter12/lyfeapp/pull/8). Migration `20261118060031_task_soft_delete` was applied to the Lyfe development project on 2026-11-18. Hosted verification found a nullable `tasks.deleted_at` timestamp, authenticated UPDATE access to that column, task RLS still enabled, and no authenticated DELETE privilege; a follow-up CLI dry run found no pending migrations. Task screens and notification behavior must follow before exposing this feature.
- In an isolated local Supabase stack, the L—5 migration applied, synthetic owner/anonymous RLS and cascade checks passed, and signup, profile provisioning/editing, sign-out, and password sign-in succeeded through the local API. The temporary stack was stopped afterward.
- On the hosted development project, `public.profiles` has RLS, owner-scoped SELECT/UPDATE policies, and the expected profile triggers. Anonymous REST access to the table was denied. Email signup is enabled and confirmation is required. Device signup, email confirmation, and session restoration have not yet been verified.
- The older repo product and architecture documents are historical proposals where they conflict with the frozen baseline.

## Completed

- Repository initialized before this audit.
- 2026-11-15: audited documentation and repository; added cross-session guidance, proposal documents, and basic CI validation.

## Next

- Review L—13's implementation PR and local verification. After approval, apply its migration to the hosted development project, verify owner-isolated Data API and app flows, then run a device pass. Production remains separate.
- Integrate L—11's attachment adapter with module screens when those screens are implemented, including a picker and delete confirmation, then verify on devices before release.
- Verify hosted signup with an organization member's email address, confirm it, edit the profile, restart the app to check session restoration, and sign out. Use a separate production project before a production release.

## Known issues and risks

- Pet screens remain placeholders. The task and vehicle screens have no native device or hosted app verification yet. Hosted auth/profile behavior still needs device verification, including email confirmation and secure session restoration.
- The development project's Security Advisor reports two warnings for its pre-existing `public.rls_auto_enable()` SECURITY DEFINER event-trigger function being executable by `anon` and `authenticated`. These warnings were present before the L—5 migration; review them before production use.
- ADR-003 settles recurrence occurrence persistence, but implementation and validation remain. The account deletion workflow is still open.
- Automated device UI tests and full native builds remain future work; L—4 checks the navigation skeleton and JavaScript bundles.
