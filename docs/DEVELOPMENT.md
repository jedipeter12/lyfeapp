# Development and verification

## Current prerequisites and setup

Install Node.js 22 or later and npm, Xcode with an iOS simulator and/or Android Studio with an emulator. Git and Python 3.11 or later are also needed for the existing repository checks. The app can run without Supabase configuration but shows a setup message instead of account access.

The existing [Lyfe App Supabase project](https://supabase.com/dashboard/project/cwyzeokzjbvfalvmqnhx) (`cwyzeokzjbvfalvmqnhx`) is the **development** project. Its API URL is `https://cwyzeokzjbvfalvmqnhx.supabase.co`, and migration `20261115210000_profiles_auth` is already applied. Copy `.env.example` to `.env.development.local`, set that URL, and get the project's publishable key from the Supabase Dashboard. The local env file is ignored by Git. Never put a service-role or secret key in an `EXPO_PUBLIC_` variable or commit it. The migration creates `profiles` with owner-scoped RLS, a signup trigger, and a backfill for existing users; do not edit it after deployment.

L—6's `20261118041954_baseline_tables` migration was applied to the hosted development project on 2026-11-17. A follow-up CLI dry run found no pending migrations. Hosted verification found all 16 baseline tables with RLS and no authenticated `DELETE` privilege. The [data model](DATA_MODEL.md) records the owner-approved restricted deletion policy. To verify locally, create a disposable PostgreSQL database, then run `supabase/tests/l6_auth_stub.sql`, both Lyfe migration files in timestamp order, and `supabase/tests/l6_baseline.sql` with `psql -v ON_ERROR_STOP=1 -f <file>`. Drop the disposable database afterward. The test rolls back synthetic account data and must not be run against hosted projects. The stub is not a full Supabase Auth service.

[ADR-001](decisions/ADR-001-task-soft-delete.md) approves a task-only soft-delete marker. Migration `20261118060031_task_soft_delete` was applied to the hosted development project on 2026-11-18. Hosted inspection verified the nullable `timestamptz` column, authenticated UPDATE privilege on it, task RLS, and continued denial of authenticated DELETE; the migration appears in hosted history and a follow-up CLI dry run found no pending migrations. To verify it in a disposable database, run `supabase/migrations/20261118060031_task_soft_delete.sql` after the L—6 migration, then run `supabase/tests/task_soft_delete.sql`. The latter tests marking, filtering, restoration, ownership, and the continued lack of physical deletion. The repository includes the active-task filter and mark/restore methods. Task UI and notification integration remain future work.

Hosted email signup is enabled and requires confirmation. Supabase's built-in mail service [sends only to organization team members](https://supabase.com/docs/guides/auth/testing-auth-flows), so use a team member's email for the first device test. Open the confirmation link, then sign in to the app. If a future flow must return directly to the app from email, implement [native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) and configure the project's allowed redirect URL.

Use a distinct Supabase project and `.env.production.local` for production builds, with `EXPO_PUBLIC_APP_ENV=production`. Expo SDK 58 loads `.env.development.local` for `expo start` and `.env.production.local` for `expo export`; `.env.local` takes precedence in both modes, so do not use it for these projects. Check the loaded project URL before a release build. Production migration and release require owner approval. No project credentials or production infrastructure are included in the repository. [Expo's environment loading rules](https://docs.expo.dev/guides/environment-variables/) and [Supabase's user management guidance](https://supabase.com/docs/guides/auth/managing-user-data) explain the underlying setup.

```bash
git clone https://github.com/jedipeter12/lyfeapp.git
cd lyfeapp
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npx expo export --platform ios --platform android
python3 scripts/check_repo.py
python3 -m unittest discover -s tests -p 'test_*.py'
```

Use `npm run ios` or `npm run android` to launch through Expo Go on a matching simulator or device. `npm start` starts the development server without opening a target. With the development project configured and the migration applied, create an account, confirm its email if required, sign in, edit the Account profile, restart the app to check session restoration, and sign out. The pet route is a placeholder; task and vehicle routes are implemented but have not had a device pass. The recurrence prototype is still not production code. There is no deployment or release procedure.

## Checks

- `python3 scripts/check_repo.py`: checks required documentation and local Markdown links.
- `python3 -m unittest discover -s tests -p 'test_*.py'`: runs prototype recurrence tests.
- `git diff --check`: catches whitespace errors in the current diff.
- `npm run format:check`: checks app source and configuration with Prettier; `npm run format` applies it.
- `npm run lint`: runs the Expo ESLint flat configuration with warnings treated as failures.
- `npm run typecheck`: checks strict TypeScript in the Expo app.
- `npm test`: runs Expo Jest unit tests, including placeholder content, auth form submission, and secure session storage behavior.
- `npx expo export --platform ios --platform android`: bundles both native targets without publishing.
- GitHub Actions runs the documentation and Python checks, installs locked app dependencies with `npm ci`, then runs formatting, lint, typecheck, unit tests, and both native bundle checks on pushes to `main` and pull requests. CI has read-only repository permission and no deploy or merge step. Run `git diff --check` locally before committing.
- Automated device UI tests, live Supabase integration tests, and full native build checks are not yet configured. The current unit test and bundle checks do not verify a live email confirmation or profile migration.
- No repository or agent hooks are configured. Local agent hooks are separate from CI and are not a substitute for it.

## L—8 data access foundation

`src/lib/supabase/repositories.ts` owns Supabase queries for profiles and the three top-level module tables (`tasks`, `pets`, and `vehicles`). Its Zod schemas in `src/schemas/entities.ts` validate write inputs and complete rows returned by the Data API. The repository always filters reads and updates by `user_id`, validates the returned owner, and checks NetInfo immediately before a write. A disconnected write throws `OfflineWriteError`; there is no offline mutation queue. PostgreSQL RLS remains the security boundary.

`src/lib/query/entities.ts` exposes user-scoped TanStack Query hooks. List queries page by 100 rows using stable `id` order. Mutations invalidate the changed user's list and detail queries; profile saves replace the cached profile with the returned row. The cache is memory-only, with a 30-second stale time and five-minute garbage collection. `QueryProvider` connects native network and app focus state and clears cached data when the signed-in user changes or signs out. Use these hooks from screens; add child-record repositories and schemas as their feature tickets define behavior. The L—6 schema is already applied to the Lyfe development project; authenticated device flows still need testing.

The task list repository excludes rows with `deleted_at` set. `listDeletedTasks` explicitly fetches marked tasks for restoration. `markTaskDeleted` and `restoreTask` update only that marker and invalidate the task query cache through their hooks. The migration is applied to the development project; task soft-delete UI and notification cleanup are not yet implemented.

## L—9 app UI conventions

`src/theme/index.ts` defines the light and dark palettes, spacing, corner radii, and matching navigation colors. The app follows the operating system color scheme. Use `useAppTheme()` for screen-specific colors; avoid adding color literals to screens. `src/components/ui` provides `AppScreen`, `AppButton`, `AppTextField`, and `FeedbackState` for safe-area layout, minimum 48-point controls, labeled inputs, and loading/empty/error messages. Keep visible text labels on navigation and controls. The existing auth, account, and placeholder routes use these components as examples.

The theme tests check WCAG AA contrast for regular text and 3:1 contrast for visible input borders. Component tests check button disabled behavior, input labels, and error announcements. These automated checks do not replace a VoiceOver/TalkBack pass on a device, large-text layout review, or visual checks of both color schemes before release.

## L—10 custom fields

`src/schemas/customFields.ts` validates definitions and scalar values for text, number, date, boolean, and single-select fields. `createRepositories` lists and creates definitions for `tasks`, `pets`, and `vehicles`, renames definitions, lists values for an owned entity, and saves a value after checking the definition's module, the entity owner, and the value type. Saves insert a new row or update only `value` on an existing row because the authenticated database role has column-limited UPDATE grants. `src/lib/query/customFields.ts` provides user-scoped query hooks and invalidation. Definitions and values cannot be physically deleted through the app role; field type, options, and module cannot be changed after creation. Module feature screens should use these hooks when their entity editing flows are built.

The existing L—6 migration provides server-side ownership, entity/module, and value checks. `supabase/tests/l10_custom_fields.sql` exercises all five types and rejects cross-module, cross-user, and invalid values. Run it only in a disposable local PostgreSQL database after `l6_auth_stub.sql` and all three migrations in timestamp order. The test rolls back its synthetic data. It does not exercise the hosted Data API or device UI.

## L—7 ownership security tests

`supabase/tests/l7_ownership_security.sql` checks owner read isolation on all 16 application tables with two fictional accounts. It also verifies that the pre-L—11 app role cannot delete rows or change ownership, that anonymous clients cannot select the tables, and that cross-user task, child-record, custom-field, and attachment links are rejected. Run it only in a disposable local PostgreSQL database after `l6_auth_stub.sql` and the first three migrations in timestamp order, using `psql -v ON_ERROR_STOP=1 -f supabase/tests/l7_ownership_security.sql`. The test rolls back its synthetic rows. This local SQL test does not exercise hosted JWT issuance, the Data API, or Storage policies.

## L—11 private attachments

[ADR-002](decisions/ADR-002-attachment-deletion.md) permits authenticated owners to delete their own attachment metadata and private files. Migration `20261119205740_l11_private_attachments` was applied to the hosted **development** project `cwyzeokzjbvfalvmqnhx` on 2026-11-20 UTC after owner approval. It created the private `lyfe-attachments` bucket with a 10 MiB limit and JPEG, PNG, WebP, and PDF MIME allowlist. It grants owner-only attachment deletion, removes client metadata-update privileges, requires a `<user UUID>/<attachment UUID>` path for new rows, and adds owner-path Storage policies for insert/select/delete. Its new metadata constraints are `NOT VALID` to avoid rewriting historical rows; they still check new inserts and updates. Hosted read-only verification found the migration in history, the expected bucket settings and policies, Storage RLS enabled, attachment DELETE granted to `authenticated` while task/pet DELETE remains denied, and zero attachment and bucket-object rows. A follow-up CLI dry run found no pending migrations. No separate production project was changed.

On 2026-11-20 UTC, a direct hosted Auth, Data, and Storage API check used two temporary administrator-created, confirmed synthetic users. It passed owner task creation, PNG upload, metadata insert and read, private download, signed URL creation and expiry, owner file and metadata deletion, cross-user metadata/download/sign/upload/delete denial, and bucket MIME and 10 MiB limit rejection. The test removed both accounts and the file; a hosted SQL check found zero matching Auth users and tasks, attachment rows, and bucket objects. This did not exercise email signup, the app's attachment adapter, or native device UI.

`src/services/storage/attachments.ts` provides list, upload, signed URL, and delete operations for owned task, pet, and vehicle targets. Callers pass an `ArrayBuffer` and a declared MIME type; the adapter checks size and a recognizable file signature, then the bucket enforces size and declared MIME on upload. Object names contain UUIDs only, not personal filenames. `src/lib/query/attachments.ts` caches owner-scoped metadata lists and invalidates them after writes. Signed links expire after 60 seconds and are returned directly, without query caching. A failed metadata insert triggers object cleanup; a failed metadata delete after object removal reports an incomplete deletion for retry or repair. The module screens still need an attachment picker and confirmation UI before people can use these operations. [Supabase recommends resumable uploads above 6 MB](https://supabase.com/docs/guides/storage/uploads/standard-uploads); a resumable upload path is not included in L—11.

To verify locally, create a **disposable** PostgreSQL database and apply `supabase/tests/l6_auth_stub.sql`, then `supabase/tests/l11_storage_stub.sql`, followed by all four migrations in timestamp order. Run `psql -v ON_ERROR_STOP=1 -f supabase/tests/l11_private_attachments.sql` against that database. The synthetic test transaction rolls back; the Storage stub covers SQL policies, not the Storage HTTP API or a real signed URL. Run `npm test -- --runTestsByPath src/services/storage/__tests__/attachments.test.ts` for adapter behavior. App adapter integration and native device behavior still require verification before release; production deployment remains unapproved.

## L—12 task screen

The Tasks tab uses `useTasksByCompletion` for owner-scoped, 100-row server-filtered pages and the existing task mutations for create, edit, complete, and reopen. New tasks use `pending` status and low/medium/high priority. Completion writes `completed` and `completed_at` together; reopening resets both. Due date and time are interpreted in the device's local time zone and stored as UTC. The form validates calendar rollover and nonexistent local times. A task can link to either an owned pet or an owned vehicle; database foreign keys enforce ownership. Task physical deletion remains forbidden. The soft-delete controls are not exposed until notification behavior is defined. Recurrence and reminders are separate tickets.

Run `npm test -- --runTestsByPath 'src/features/tasks/__tests__/taskForm.test.ts' 'src/lib/supabase/__tests__/repositories.test.ts' 'app/(tabs)/__tests__/tasks.test.tsx'` for the form, repository, and screen-flow tests. For the SQL integration test, use a **disposable** PostgreSQL database: apply `supabase/tests/l6_auth_stub.sql`, migrations `20261115210000_profiles_auth`, `20261118041954_baseline_tables`, and `20261118060031_task_soft_delete` in timestamp order, then run `supabase/tests/l12_task_flow.sql` with `psql -v ON_ERROR_STOP=1`. The SQL test rolls back its synthetic data. It covers create/edit/complete/reopen, completion filters, pet-to-vehicle relinking, and cross-owner isolation. Native UI and hosted Data API flows still need verification.

## L—13 recurrence and occurrence history

Accepted [ADR-003](decisions/ADR-003-recurrence-occurrence-persistence.md) governs the recurrence behavior. A dated task can be given a daily, weekly, monthly, or yearly rule from its Tasks card. Weekly rules may select weekdays; intervals, IANA time zone, and an optional inclusive end date are editable. The first due date is an immutable local calendar anchor. The pure generator in `src/features/tasks/recurrence.ts` resolves spring gaps to the first valid local minute and fall overlaps to the earlier instant. Each completion records one occurrence and advances the task's next due date in one owner-checked transaction. Retries for the same target return the existing history row. Completed occurrences cannot be reopened in this version. The Tasks screen lists paged completion history; recurring tasks retain pending status until the last occurrence.

Migration `20261120222601_l13_recurrence_occurrences` has been tested only in a disposable local database. It is not applied to the hosted development project, so that project's app cannot use repeat controls yet. The migration checks for duplicate rules and undated/completed recurring tasks before backfilling anchors; recheck hosted data before applying it. Applying the hosted migration requires separate owner approval. Local testing used an isolated Supabase PostgreSQL container with the existing Auth schema, a Storage stub, and all migrations in timestamp order. Run `supabase/tests/l13_recurrence_occurrences.sql` with `psql -v ON_ERROR_STOP=1` only there; its synthetic rows roll back. The SQL test covers owner isolation, rule editing, multiple completions, retries, grants, and the task-state guard. Run `npm test -- --runTestsByPath src/features/tasks/__tests__/recurrence.test.ts src/lib/supabase/__tests__/recurrence.test.ts 'app/(tabs)/__tests__/tasks.test.tsx'` for calendar, repository, and screen behavior. Hosted Data API and native device flows remain to be verified after migration approval.

## L—17 vehicle profiles and mileage

The Vehicles tab lists paged owner-scoped profiles and supports creating and editing year, make, model, optional VIN, and optional current mileage. The form uppercases the VIN and removes whitespace; the existing database trigger applies the same normalization and enforces per-user VIN uniqueness. A vehicle's mileage history is a separate paged list. Recording a reading uses the device's current timestamp and does not change `current_mileage`; edit the profile to change that field. Reads and writes validate the owner and vehicle link, and writes require network connectivity. Existing L—6 RLS, composite foreign keys, and grants enforce the server boundary. No schema migration is needed.

Run `npm test -- --runTestsByPath src/features/vehicles/__tests__/vehicleForm.test.ts src/lib/supabase/__tests__/vehicles.test.ts 'app/(tabs)/__tests__/vehicles.test.tsx'` for form, repository, and screen flows. The existing `supabase/tests/l7_ownership_security.sql` tests cross-owner mileage references in a disposable database. Hosted Data API and native device flows still need validation. [ADR-006](decisions/ADR-006-vehicle-deletion.md) retains the accepted L—6 individual vehicle deletion restriction for launch.

## Security and privacy

Never commit credentials or real personal information. `.gitignore` excludes common local secret files, but ignore rules are not a secret scanner. Inspect staged changes before committing. Enable GitHub secret scanning and dependency alerts in repository settings if available; those settings are outside the tracked repository and have not been verified here. `npm ci` currently reports moderate dependency advisories; assess those separately before adding an audit gate or upgrading Expo dependencies.

Use synthetic example dates and notes. Do not place sensitive item contents in logs or bug reports. The proposed data and backup policy is in `ARCHITECTURE.md`.

## Branch and PR workflow

Create a focused `codex/` branch for agent work. Review `git status` and the final diff, run applicable checks, then open a PR with scope, evidence, decisions, and risks. CI verifies code; it does not authorize merge or deployment. Do not merge to `main` without explicit owner approval.

## Tool-specific agent configuration

`AGENTS.md` is the shared instruction source. Codex uses it directly. [Cursor's documented root AGENTS.md support](https://docs.cursor.com/context/rules-for-ai) allows the same file without a separate rule. [Claude Code uses CLAUDE.md for project instructions](https://code.claude.com/docs/en/settings); the root `CLAUDE.md` points to `AGENTS.md`. We have not run all three tools against this repository, so actual loading is not claimed as tested.

Specialized architecture, implementation, debugging, quality, and security agents were considered. At this stage they would repeat `AGENTS.md` and unresolved specifications. Add scoped configurations only when a repeated workflow demonstrates a need; do not add an orchestration layer now.

## Session handoff

Read `AGENTS.md` and the assigned backlog item, inspect current code and Git state, then use `ROADMAP.md` for current project status. End with files changed, exact checks run or skipped, material risks, and the next ready task. Update the existing documents, avoiding a parallel status log.
