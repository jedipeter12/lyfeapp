# Development and verification

## Current prerequisites and setup

For the Expo skeleton, install Node.js and npm, Xcode with an iOS simulator and/or Android Studio with an emulator. Git and Python 3.11 or later are also needed for the existing repository checks. No Supabase credentials are needed for the navigation placeholders.

```bash
git clone https://github.com/jedipeter12/lyfeapp.git
cd lyfeapp
npm ci
npm run typecheck
npx expo export --platform ios --platform android
python3 scripts/check_repo.py
python3 -m unittest discover -s tests -p 'test_*.py'
```

Use `npm run ios` or `npm run android` to launch through Expo Go on a matching simulator or device. `npm start` starts the development server without opening a target. The current routes are placeholders; no sign-in or data operations exist yet. The recurrence prototype is still not production code. There is no deployment or release procedure.

## Checks

- `python3 scripts/check_repo.py`: checks required documentation and local Markdown links.
- `python3 -m unittest discover -s tests -p 'test_*.py'`: runs prototype recurrence tests.
- `git diff --check`: catches whitespace errors in the current diff.
- `npm run typecheck`: checks strict TypeScript in the Expo app.
- `npx expo export --platform ios --platform android`: bundles both native targets without publishing.
- GitHub Actions runs the first two checks on pushes to `main` and pull requests. CI has read-only repository permission and no deploy or merge step. Run `git diff --check` locally before committing.
- Formatting, linting, automated UI tests, and full device build checks are not yet configured. The Expo bundle and type check cover this navigation skeleton; ticket L—4 owns broader quality gates.
- No repository or agent hooks are configured. Local agent hooks are separate from CI and are not a substitute for it.

## Security and privacy

Never commit credentials or real personal information. `.gitignore` excludes common local secret files, but ignore rules are not a secret scanner. Inspect staged changes before committing. Enable GitHub secret scanning and dependency alerts in repository settings if available; those settings are outside the tracked repository and have not been verified here. A dedicated dependency check becomes useful when dependencies exist.

Use synthetic example dates and notes. Do not place sensitive item contents in logs or bug reports. The proposed data and backup policy is in `ARCHITECTURE.md`.

## Branch and PR workflow

Create a focused `codex/` branch for agent work. Review `git status` and the final diff, run applicable checks, then open a PR with scope, evidence, decisions, and risks. CI verifies code; it does not authorize merge or deployment. Do not merge to `main` without explicit owner approval.

## Tool-specific agent configuration

`AGENTS.md` is the shared instruction source. Codex uses it directly. [Cursor's documented root AGENTS.md support](https://docs.cursor.com/context/rules-for-ai) allows the same file without a separate rule. [Claude Code uses CLAUDE.md for project instructions](https://code.claude.com/docs/en/settings); the root `CLAUDE.md` points to `AGENTS.md`. We have not run all three tools against this repository, so actual loading is not claimed as tested.

Specialized architecture, implementation, debugging, quality, and security agents were considered. At this stage they would repeat `AGENTS.md` and unresolved specifications. Add scoped configurations only when a repeated workflow demonstrates a need; do not add an orchestration layer now.

## Session handoff

Read `AGENTS.md` and the assigned backlog item, inspect current code and Git state, then use `ROADMAP.md` for current project status. End with files changed, exact checks run or skipped, material risks, and the next ready task. Update the existing documents, avoiding a parallel status log.
