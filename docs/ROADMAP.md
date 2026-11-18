# Roadmap and handoff

The active queue is the [Lyfe Work/Tickets database](https://app.notion.com/p/3c135ab73db380f29231df07b4263bab?pvs=204). The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) governs the MVP.

## Current objective

Establish the approved Expo app foundation, then follow the Notion ticket dependencies for data, security, and features.

## Current state

- The frozen architecture approves the production stack and MVP scope.
- Ticket L—3's Expo Router navigation skeleton with strict TypeScript is merged.
- Ticket L—4's app quality gates are merged: Prettier, Expo ESLint, Jest unit tests, TypeScript, and native bundle checks in CI.
- Ticket L—5's Supabase client configuration, email/password authentication, secure session storage, route guards, and profile migration are merged. The existing Free-plan Supabase project **Lyfe App** (`cwyzeokzjbvfalvmqnhx`) is designated for development. Migration `20261115210000_profiles_auth` was applied there on 2026-11-16; a follow-up CLI dry run found no pending migrations.
- Ticket L—6 has a migration and local SQL tests in [PR #6](https://github.com/jedipeter12/lyfeapp/pull/6). The owner approved restricted individual deletion for the MVP on 2026-11-17; the decision is recorded in `DECISIONS.md`. The PR awaits review and merge. No L—6 migration has been applied to a hosted project.
- In an isolated local Supabase stack, the L—5 migration applied, synthetic owner/anonymous RLS and cascade checks passed, and signup, profile provisioning/editing, sign-out, and password sign-in succeeded through the local API. The temporary stack was stopped afterward.
- On the hosted development project, `public.profiles` has RLS, owner-scoped SELECT/UPDATE policies, and the expected profile triggers. Anonymous REST access to the table was denied. Email signup is enabled and confirmation is required. Device signup, email confirmation, and session restoration have not yet been verified.
- The older repo product and architecture documents are historical proposals where they conflict with the frozen baseline.

## Completed

- Repository initialized before this audit.
- 2026-11-15: audited documentation and repository; added cross-session guidance, proposal documents, and basic CI validation.

## Next

- Review and merge L—6's PR, then apply its migration to the development project as a separately approved step. L—9's design system work can proceed independently.
- Verify hosted signup with an organization member's email address, confirm it, edit the profile, restart the app to check session restoration, and sign out. Use a separate production project before a production release.

## Known issues and risks

- Task, pet, and vehicle screens remain placeholders. Hosted auth/profile behavior still needs device verification, including email confirmation and secure session restoration.
- The development project's Security Advisor reports two warnings for its pre-existing `public.rls_auto_enable()` SECURITY DEFINER event-trigger function being executable by `anon` and `authenticated`. These warnings were present before the L—5 migration; review them before production use.
- Recurrence occurrence persistence and destructive-operation policy remain open before those features are implemented.
- Automated device UI tests and full native builds remain future work; L—4 checks the navigation skeleton and JavaScript bundles.
