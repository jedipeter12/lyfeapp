# Lyfe agent instructions

Lyfe is a life maintenance app for recurring responsibilities, not a general habit tracker. The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) in Notion is the approved MVP source of truth. The older proposals in `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, and `docs/DOMAIN_MODEL.md` are historical where they differ from it. `docs/DECISIONS.md` records this precedence and remaining decisions.

## Start each task

1. Identify the assigned task and inspect the relevant files and Git state before editing.
2. Read `README.md`, then only documentation relevant to the task: product behavior in `docs/PRODUCT.md`, architecture and domain work in `docs/ARCHITECTURE.md` and `docs/DOMAIN_MODEL.md`, status in `docs/ROADMAP.md`, and commands in `docs/DEVELOPMENT.md`.
3. Check `docs/DECISIONS.md` before changing an established choice. Use `docs/BACKLOG.md` for independently executable work.

## Work and verify

- Make focused, reversible changes. Preserve existing behavior and history. Follow existing conventions; when none exist, keep code and dependencies minimal and document new conventions.
- Do not turn an example, proposal, or open question into an approved requirement. Follow the frozen Architecture v1.0 for the approved stack and scope. Ask the owner before changing that baseline or settling consequential behavior it leaves open. Independent prototypes may state assumptions explicitly.
- Add meaningful tests for behavior changes. Run applicable checks in `docs/DEVELOPMENT.md`, review the diff, and report actual results and remaining risks. A passing check never grants permission to merge or deploy.
- Protect personal data: use synthetic fixtures, validate inputs, minimize sensitive logs, and never commit secrets or credentials. Review data collection and retention when introducing storage or integrations.
- Update the relevant existing document when behavior, architecture, decisions, status, or developer workflow changes. Mark proposals and outstanding decisions clearly; do not invent project history.
- Work on a focused branch and prepare a reviewable PR for material changes. Do not merge, deploy, provision production infrastructure, or publish without explicit owner approval.
- End with a handoff: changed files, verification performed, unresolved questions or risks, and the next ready task. Put durable facts in the repository rather than relying on chat history.
