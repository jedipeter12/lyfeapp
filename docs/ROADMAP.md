# Roadmap and handoff

The active queue is the [Lyfe Work/Tickets database](https://app.notion.com/p/3c135ab73db380f29231df07b4263bab?pvs=204). The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) governs the MVP.

## Current objective

Establish the approved Expo app foundation, then follow the Notion ticket dependencies for data, security, and features.

## Current state

- The frozen architecture approves the production stack and MVP scope.
- Ticket L—3's Expo Router navigation skeleton with strict TypeScript is merged. Authentication and data are not implemented.
- Ticket L—4's app quality gates are merged: Prettier, Expo ESLint, Jest unit tests, TypeScript, and native bundle checks in CI.
- Ticket L—5 adds Supabase client configuration, email/password authentication, secure session storage, route guards, and a profile migration on a review branch. No Supabase project has been provisioned or migrated by this repository change.
- In an isolated local Supabase stack, the L—5 migration applied, synthetic owner/anonymous RLS and cascade checks passed, and signup, profile provisioning/editing, sign-out, and password sign-in succeeded through the local API. The temporary stack was stopped afterward.
- The older repo product and architecture documents are historical proposals where they conflict with the frozen baseline.

## Completed

- Repository initialized before this audit.
- 2026-11-15: audited documentation and repository; added cross-session guidance, proposal documents, and basic CI validation.

## Next

- Review L—5 for merge. Local migration, RLS, and Auth API checks passed; a hosted project is not required to review this code. Merging requires explicit owner approval.
- After L—5 merges, take L—6, the remaining 15 baseline tables. L—9's design system work depends only on the merged Expo foundation and can proceed independently.
- Before treating hosted auth as validated, configure a development Supabase project and check email confirmation and secure session restoration on a device. Use a separate production project before a production release.

## Known issues and risks

- Task, pet, and vehicle screens remain placeholders. Auth/profile behavior still needs a hosted development project and device verification, including email confirmation and secure session restoration.
- Recurrence occurrence persistence and destructive-operation policy remain open before those features are implemented.
- Automated device UI tests and full native builds remain future work; L—4 checks the navigation skeleton and JavaScript bundles.
