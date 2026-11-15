# Prioritized engineering backlog

> Historical audit backlog. The active implementation queue is the [Lyfe Work/Tickets database](https://app.notion.com/p/3c135ab73db380f29231df07b4263bab?pvs=204). Follow its ticket dependencies and frozen architecture.

**Status:** Proposed tasks for transfer to the existing [Lyfe Work/Tickets Notion database](https://app.notion.com/p/3c135ab73db380f29231df07b4263bab?pvs=204). The database had no rows when inspected on 2026-11-15. This file is a planning artifact, not a claim that Notion tickets exist. Priority runs top to bottom within each section.

## Ready for Agent

### R1 — Harden recurrence date arithmetic prototype

**Goal:** Expand the existing dependency-free date prototype with boundary coverage for its stated assumptions.

**Acceptance criteria:** Cover century leap rules, multi-month/year intervals, invalid inputs, and date-only comparison with deterministic inputs/outputs. Keep it independent of UI, storage, and notification APIs.

**Context and scope:** Start from `prototypes/recurrence.py`, `tests/test_recurrence.py`, and `DOMAIN_MODEL.md`. Keep it a prototype; do not create a production schema or framework. Do not add disputed occurrence-completion behavior before D3 is accepted.

**Validation/evidence:** Add boundary tests, run the full `unittest` command, and include example input/output plus changed assumptions in the PR.

### R2 — Prepare synthetic domain fixtures

**Goal:** Provide reusable, obviously fictional examples for design and adapter tests.

**Acceptance criteria:** Cover one-time, fixed calendar, after-completion, paused, and incomplete-history items; no names, addresses, health details, or real service records.

**Context and scope:** Use `DOMAIN_MODEL.md`. Keep fixtures outside production persistence until D1-D5 are resolved. Avoid speculative assets and attachments.

**Validation/evidence:** Validate fixture dates and references with a small test or parser, document their purpose, and show the test result.

## Owner Decision Required

### O1 — Confirm smallest MVP and recurrence policy

**Goal:** Accept or revise `PRODUCT.md` and `DOMAIN_MODEL.md`, especially fixed occurrence completion, early completion, calendar clamping, time-zone changes, and reminders.

**Acceptance criteria:** A dated accepted entry in `DECISIONS.md` resolves D3 and names included/deferred rules. Ambiguous examples are revised accordingly.

**Context and scope:** No production rule engine or migrations until resolved.

**Validation/evidence:** Owner decision and updated scenario table; no code test required for the decision itself.

### O2 — Choose first platform and data boundary

**Goal:** Resolve D1, D2, and D4, including backup/recovery expectations and permitted personal data.

**Acceptance criteria:** Accepted decision entries compare platform and storage alternatives and define release constraints.

**Context and scope:** Use `ARCHITECTURE.md` tradeoffs; do not create accounts or cloud resources by default.

**Validation/evidence:** Owner decision, updated product/architecture documentation.

### O3 — Select production implementation

**Goal:** Resolve D5 after O1 and O2.

**Acceptance criteria:** Framework, persistence, notification approach, and minimum supported OS/browser versions are recorded with maintenance and cost rationale.

**Context and scope:** A small independently operated app. No production migration, deployment, or vendor account before acceptance.

**Validation/evidence:** Decision entry, a runnable setup guide, and a thin tested vertical slice in its own PR.

## Blocked

### B0 — Add application checks to CI

**Goal:** When application code lands, add its actual format, lint, type, test, build, and dependency commands to CI and `DEVELOPMENT.md`.

**Acceptance criteria:** Local commands and CI match; CI retains read-only permission and no deploy step; failures block the check; checks finish in a reasonable time.

**Context and scope:** Blocked until D5 and application code exist. Preserve the documentation check. Avoid paid services and expensive local hooks.

**Validation/evidence:** Run all commands locally and show the first PR CI result.

### B1 — End-to-end application tests

**Goal:** Verify create, due-list, completion, reminder permission, export, and recovery journeys.

**Acceptance criteria:** Tests exercise the selected app on supported targets and include accessibility checks.

**Context and scope:** Blocked until a production app and platform exist.

**Validation/evidence:** CI and device/simulator results, with failures recorded.

## Future

### F1 — Usage and mileage triggers

**Goal:** Add meter-based due rules if users validate their value.

**Acceptance criteria:** Defines units, readings, rollover/correction, unknown readings, and combined date/usage precedence before implementation.

**Context and scope:** Deferred from the proposed MVP.

**Validation/evidence:** Domain scenarios and adapter tests after approval.

### F2 — Accounts, sync, sharing, and integrations

**Goal:** Evaluate only after a single-device MVP reveals a need.

**Acceptance criteria:** Explicit security, conflict, cost, recovery, and consent design precedes implementation.

**Context and scope:** No current implementation authorization.

**Validation/evidence:** Decision record and focused tests when prioritized.
