# ADR-003: Recurrence occurrence persistence

**Status:** Proposed for owner decision, 2026-11-20. No migration or recurrence behavior is authorized by this proposal.

## Context

L—13 requires daily, weekly, monthly, and yearly recurrence with time-zone and daylight-saving behavior, durable completion history, and idempotency tests. L—12 task CRUD is merged. The frozen Architecture v1.0 names 16 application tables and explicitly requires occurrence persistence to be settled before implementation. Today `tasks.completed_at` can represent only one completion, `tasks.due_at` is the only due instant used by the task list, and `recurrence_rules` stores a cadence but no anchor or occurrence history. The schema permits multiple rules for one task. None of those fields can reconstruct which of several scheduled occurrences a completion satisfied after a rule edit or a time-zone change.

## Proposed decision

Add a seventeenth owner-scoped `task_occurrences` table in a new versioned migration. Keep the existing 16 tables; add an immutable anchor to `recurrence_rules` and enforce one rule per task after checking for existing duplicates. A proposed minimum occurrence row is:

| Field | Purpose |
| --- | --- |
| `id`, `user_id`, `task_id`, `recurrence_rule_id` | UUID identity and same-owner links to the task and rule. |
| `scheduled_local_date`, `scheduled_at`, `timezone` | Preserve the local calendar occurrence and resolved UTC instant even if the rule is later edited. |
| `completed_at`, `created_at` | Preserve the completion instant and audit creation time. |

Only completed occurrences need rows in the first version. A unique constraint on `(user_id, task_id, scheduled_local_date)` prevents a second completion for the same calendar occurrence, including after a rule edit. A separate index on `(user_id, task_id, scheduled_local_date desc)` supports history. The task and rule must belong to the same owner, and the rule must belong to that task. Enable RLS and restrict `SELECT` and creation to the owner; retain the existing no-physical-delete policy. If completion correction is allowed, define a narrow update path instead of granting broad row updates.

Store the original local date and wall-clock time as immutable rule anchor fields; retain the rule's IANA `timezone` for resolving future occurrences. Calculate every occurrence from those calendar fields rather than repeatedly adding to the previous UTC instant or a clamped date. `tasks.due_at` remains the next scheduled UTC instant for the existing task list. The recurring task stays pending between occurrences, while `task_occurrences` is the source of completion history. When a rule ends, settle the task's final status and `completed_at` explicitly. Completion and advancement of `tasks.due_at` must be one database transaction, exposed through a narrowly granted, owner-checked operation; a two-request client sequence could leave history and the due list inconsistent. The operation must accept a stable target occurrence date from the caller and return the existing row on a retry of that target, even if `tasks.due_at` has advanced. Online-only mutations and the typed repository boundary remain in force.

On migration, do not infer missing historical occurrences from an existing `tasks.completed_at`. Report any existing recurrence rules, duplicate rules per task, or completed tasks linked to rules for review before backfilling or adding the one-rule constraint. Do not rewrite the applied baseline migration.

A read-only aggregate query of the designated development project on 2026-11-20 found zero recurrence rules, zero completed tasks linked to rules, and zero tasks with multiple rules. No development recurrence backfill is currently needed. Recheck immediately before any migration because the data may change; this inspection says nothing about a future production project.

## Calendar policy proposed for approval

- Daily uses every `interval` local calendar days. Weekly uses selected weekdays (`0` Sunday through `6` Saturday), with `interval` counting weeks from the anchor week; when weekdays are absent, use the anchor weekday. Monthly and yearly use the anchor day, clamping to the last day of a shorter month, so a January 31 anchor returns to March 31 and a February 29 yearly anchor returns to February 29 in leap years.
- Resolve each local date and wall-clock time in the rule time zone. For a nonexistent spring-forward time, move to the first valid local time after the gap. For a repeated fall-back time, use the earlier instant. Store both the resulting instant and the intended local date on completion. Never add 24 hours in UTC to implement a calendar day.
- Apply `end_at` as an inclusive UTC limit on generated scheduled instants. A rule time-zone edit affects future, uncompleted occurrences only; persisted history remains unchanged.

## Completion policy requiring owner choice

The persistence design depends on how a completion maps to a scheduled occurrence. Recommended behavior: complete the oldest uncompleted occurrence due at or before the action time; if none is due, complete the next upcoming occurrence so early work counts. Record at most one completion per action. A late action does not silently clear other missed occurrences. A second request for the same target occurrence returns its existing row and must not advance `tasks.due_at` again. Keep completed occurrence rows immutable in the first version. If correction or undo is required for MVP, add an explicit correction state or event and recalculate the next due instant atomically; a simple deletion would erase history and violate the current no-delete policy.

The owner should decide whether missed occurrences remain individually actionable or are skipped when a later one is completed, whether early completion is allowed without a time limit, and whether correction or undo is required in MVP. Those choices affect due-list behavior, the transactional operation, and reminder cancellation. Approval of this ADR should name the chosen policy before implementation starts.

## Alternatives and consequences

- Reuse `tasks.completed_at`: no schema change, but only the latest completion survives and retries cannot be associated with a specific occurrence. It does not meet L—13 history.
- Store a JSON history on `recurrence_rules`: keeps 16 tables, but cannot enforce one completion per occurrence or same-owner references with normal constraints; updates would rewrite an ever-growing value and complicate concurrency and history queries.
- Store an occurrence row for every future date: simplifies some reminder queries but creates an unbounded generation and cleanup problem. Materialize completed history only, and derive a bounded upcoming window when needed.

The proposed table and anchor extend the frozen baseline and therefore require owner approval. They add migration, RLS, and transactional-operation maintenance. The task list will need to show recurring due state without treating `tasks.completed_at` as the completion history. Existing one-time task behavior should remain intact.

## Implementation and verification after approval

1. Confirm the completion, early/late, undo, rule-edit, and DST policies above. Audit development data for recurrence rules and determine an explicit migration/backfill path.
2. Add a versioned migration, owner-scoped policies and grants, composite foreign keys, the idempotency constraint, and the atomic completion operation. Keep production untouched until separately approved.
3. Add a pure calendar generator and typed repository/query methods. Integrate recurring task create/edit/complete/history in the task UI, then coordinate local reminders in its separate ticket.
4. Test all four frequencies; month-end and leap-year anchors; spring and fall DST in more than one IANA zone; rule edits; cross-owner denial; concurrent/retried completion; multiple missed occurrences; early completion; undo; and end boundaries. Run local SQL and app checks and verify a hosted development flow only after migration approval.
