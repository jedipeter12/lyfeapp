# ADR-001: Task-only soft deletion

**Status:** Proposed, 2026-11-18. Owner approval required before merge or deployment.

## Context

The frozen Architecture v1.0 lists task fields without a deletion marker. The accepted L—6 decision disallows individual physical deletion or archive behavior in the MVP. The owner has asked whether tasks could at least be marked and filtered out. This proposal changes that decision for tasks only and adds one column to the approved 16-table baseline.

## Proposed decision

- Add nullable `tasks.deleted_at timestamptz` in a new versioned migration. `NULL` means active; a timestamp means marked for deletion. Restoring sets it back to `NULL`.
- Keep physical `DELETE` unavailable to the app role. Keep marked rows and their recurrence rules, reminders, attachments, and custom field values for restoration and account deletion.
- Default task lists, search, dashboard counts, due views, and future recurrence/reminder scheduling must exclude tasks with `deleted_at IS NOT NULL`. A restore path may read marked tasks. Marking a task must cancel any pending local notification when notifications are implemented.
- Only tasks get this behavior in the MVP. Pets and vehicles retain the L—6 restriction. Account deletion remains a separate workflow.

The L—8 typed repository and query cache work is currently in progress. The repository filter and mark/restore mutations must land before this can be exposed to users. The migration alone does not hide tasks in the app.

## Alternatives and consequences

Using `status = 'deleted'` mixes task progress with visibility and loses the deletion time. Physical deletion would discard linked history and conflicts with the accepted L—6 boundary. A dedicated marker preserves the task and allows restoration, but requires every active task query and scheduler to apply the same filter. There is no retention timer or automatic purge in this proposal.

Supabase documents the nullable timestamp and active-query filter as a [soft-delete pattern](https://supabase.com/docs/guides/database/postgres/data-deletion).
