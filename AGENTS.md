# Lyfe agent instructions

Lyfe is an early-stage life maintenance app for recurring responsibilities, not a general habit tracker. `docs/PRODUCT.md` records the approved direction; its MVP proposal and `docs/ARCHITECTURE.md` are recommendations until the owner accepts them. `docs/DECISIONS.md` records accepted decisions. No application stack or production data model has been approved.

## Start each task

1. Identify the assigned task and inspect the relevant files and Git state before editing.
2. Read `README.md`, then only documentation relevant to the task: product behavior in `docs/PRODUCT.md`, architecture and domain work in `docs/ARCHITECTURE.md` and `docs/DOMAIN_MODEL.md`, status in `docs/ROADMAP.md`, and commands in `docs/DEVELOPMENT.md`.
3. Check `docs/DECISIONS.md` before changing an established choice. Use `docs/BACKLOG.md` for independently executable work.

## Work and verify

- Make focused, reversible changes. Preserve existing behavior and history. Follow existing conventions; when none exist, keep code and dependencies minimal and document new conventions.
- Do not turn an example, proposal, or open question into an approved requirement. Ask the owner before choosing a production framework, hosting provider, database, authentication service, or consequential product behavior. Independent prototypes may state assumptions explicitly.
- Add meaningful tests for behavior changes. Run applicable checks in `docs/DEVELOPMENT.md`, review the diff, and report actual results and remaining risks. A passing check never grants permission to merge or deploy.
- Protect personal data: use synthetic fixtures, validate inputs, minimize sensitive logs, and never commit secrets or credentials. Review data collection and retention when introducing storage or integrations.
- Update the relevant existing document when behavior, architecture, decisions, status, or developer workflow changes. Mark proposals and outstanding decisions clearly; do not invent project history.
- Work on a focused branch and prepare a reviewable PR for material changes. Do not merge, deploy, provision production infrastructure, or publish without explicit owner approval.
- End with a handoff: changed files, verification performed, unresolved questions or risks, and the next ready task. Put durable facts in the repository rather than relying on chat history.
