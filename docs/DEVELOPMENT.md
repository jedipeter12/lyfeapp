# Development and verification

## Current prerequisites and setup

Install Node.js 22 or later and npm, Xcode with an iOS simulator and/or Android Studio with an emulator. Git and Python 3.11 or later are also needed for the existing repository checks. The app can run without Supabase configuration but shows a setup message instead of account access.

The existing [Lyfe App Supabase project](https://supabase.com/dashboard/project/cwyzeokzjbvfalvmqnhx) (`cwyzeokzjbvfalvmqnhx`) is the **development** project. Its API URL is `https://cwyzeokzjbvfalvmqnhx.supabase.co`, and migration `20261115210000_profiles_auth` is already applied. Copy `.env.example` to `.env.development.local`, set that URL, and get the project's publishable key from the Supabase Dashboard. The local env file is ignored by Git. Never put a service-role or secret key in an `EXPO_PUBLIC_` variable or commit it. The migration creates `profiles` with owner-scoped RLS, a signup trigger, and a backfill for existing users; do not edit it after deployment.

L—6's `20261118041954_baseline_tables` migration is a draft and has not been applied to the hosted development project. Its [data model](DATA_MODEL.md) and delete policy proposal need review before merge. To verify locally, create a disposable PostgreSQL database, then run `supabase/tests/l6_auth_stub.sql`, both Lyfe migration files in timestamp order, and `supabase/tests/l6_baseline.sql` with `psql -v ON_ERROR_STOP=1 -f <file>`. Drop the disposable database afterward. The test rolls back synthetic account data and must not be run against hosted projects. The stub is not a full Supabase Auth service.

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

Use `npm run ios` or `npm run android` to launch through Expo Go on a matching simulator or device. `npm start` starts the development server without opening a target. With the development project configured and the migration applied, create an account, confirm its email if required, sign in, edit the Account profile, restart the app to check session restoration, and sign out. Task, pet, and vehicle routes are placeholders. The recurrence prototype is still not production code. There is no deployment or release procedure.

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
