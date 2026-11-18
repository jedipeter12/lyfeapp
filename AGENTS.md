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

## Development Operations Reporting Protocol

The Outlanders Development Chief of Staff checks Lyfe through Notion and GitHub approximately every four hours and cannot rely on live Codex conversations. The existing Notion ticket database remains the source of truth for ticket scope, ownership, dependencies, and completion. GitHub carries implementation evidence and operational handoffs. Do not change the central Operations Dashboard or create duplicate Notion tickets without authorization. Apply this protocol only to Lyfe; do not inspect or synchronize another repository to implement it.

### Execution status

Use exactly one of these values for the current work on a ticket:

| Status | Meaning |
| --- | --- |
| `IN_PROGRESS` | An agent is actively implementing assigned work. |
| `AGENT_ACTIONABLE` | The next step can be performed by an agent without owner involvement. |
| `AWAITING_OWNER` | A specific human action, other than an approval or decision, is required. |
| `AWAITING_APPROVAL` | An owner approval or decision is required. |
| `BLOCKED_EXTERNAL` | Progress depends on an external service or party. |
| `READY_FOR_REVIEW` | Implementation and available validation are ready for review. |
| `COMPLETE` | Established acceptance criteria and required validation are satisfied. |

Execution status describes the ticket's current work, not whether an agent session is open. An inactive session does not make a ticket blocked or complete. Before ending a session, replace `IN_PROGRESS` with the applicable next state; never imply that an agent remains active after the session ends. If one part is blocked but other work can continue, describe both and do not mark the entire project blocked. Do not use `COMPLETE` merely because a session or implementation step ended.

### Durable status record

For ticket work, add or maintain one clearly identified `Development Operations Status` section in the associated GitHub PR description, preserving other PR content. If no PR exists, use an existing linked GitHub issue when appropriate. Create a scoped issue only for a genuine blocker that needs tracking and only when the repository workflow permits it; avoid duplicate issues and records. Never create a meaningless commit or PR solely to publish status. Publishing remains subject to the approval rule above. If no suitable GitHub record can be updated, include the status in the final Codex response and state plainly that it is not externally visible to the Chief of Staff.

Keep these field names and order unchanged for automated parsing. Use `Lyfe` for Project, the actual Notion ticket ID or `None` if none was assigned, actual URLs or `None`, and an ISO 8601 UTC timestamp such as `2026-11-18T20:00:00Z`. Do not invent a ticket or link.

```text
## Development Operations Status

Project: Lyfe
Ticket: [Notion ticket ID or None]
Execution Status: [IN_PROGRESS/AGENT_ACTIONABLE/AWAITING_OWNER/AWAITING_APPROVAL/BLOCKED_EXTERNAL/READY_FOR_REVIEW/COMPLETE]
Human Action Required: [Yes/No]
Action Channel: [Phone/Laptop/Either/None]
Blocker: [Specific blocker or None]
Exact Next Step: [Actionable instruction]
Downstream Impact: [What this blocks, or None]
Completed Work: [Summary, including what changed since the previous update]
Remaining Work: [Summary, including work agents can continue independently]
Validation Results: [Checks run, results, and required checks still outstanding]
PR or Issue URL: [URL or None]
Updated At: [UTC timestamp]
```

Update the record when beginning substantive ticket work, encountering a blocker, discovering owner involvement, completing a meaningful milestone, opening or substantially updating a PR, encountering or resolving validation failures, preparing review, and ending or pausing a session. Do not post repeated updates when nothing meaningful changed. Record actual results rather than planned tests as if they passed.

### Human handoffs and priorities

Before requesting owner action, determine whether an agent can complete the work independently. Agents can usually investigate, implement, test, document, prepare configurations, review requirements, propose solutions, and prepare decisions for approval. Account registration or identity verification, financial commitments, production credential or security approvals, product or business decisions, physical-device testing, final release approvals, and actions requiring authenticated owner access may require a human.

For each human handoff, make `Exact Next Step` say what the owner must do and where; make `Blocker` explain why an agent cannot do it; set `Action Channel` to `Phone`, `Laptop`, or `Either` only after checking what is practical; use `Downstream Impact` to say what the action unlocks; and use `Remaining Work` to say whether independent agent work can continue. Set `Human Action Required` to `Yes` only when a concrete owner action is needed. Never request or disclose secrets in GitHub issues, PRs, or committed files.

Choose the next action by considering downstream work unlocked, the critical path, whether an agent can do it, how quickly the owner could resolve it, and whether it can be done by phone during the owner's workday. Surface owner actions that unlock substantial agent work promptly; do not escalate minor implementation choices unnecessarily.

### Session handoff and boundaries

Before ending a coding session, update the durable record when available. In the final handoff, summarize completed implementation, validation results, unresolved blockers, the next agent-actionable step, any human-required action, and the associated Notion ticket and PR or issue links. Explicitly state whether more agent work can proceed without owner involvement. A session ending does not complete a ticket; use its established acceptance criteria and required validation before marking it `COMPLETE`.

This protocol does not authorize agents to merge PRs requiring owner approval, deploy production changes, modify production databases, approve financial commitments, change architecture outside authorized scope, expose credentials or sensitive information, perform irreversible actions, or modify unrelated repositories or projects. Preserve all existing security, testing, and approval requirements above.
