# ADR-005: keep individual pet deletion restricted for MVP

**Status:** Accepted by the owner on 2026-11-24.

## Context

Ticket L—15 asks for pet CRUD. The accepted L—6 policy explicitly forbids authenticated deletion of individual pets and their child records. Pets can have linked tasks, weight history, other health records, custom fields, and attachments. The L—15 implementation therefore supports creating, reading, and editing pets and weight entries, but does not expose deletion.

## Decision

Keep the accepted L—6 restriction for the MVP. L—15's create/read/update, weight, validation, history, ownership, and empty-state work satisfies its clarified scope without individual pet deletion. The owner may reconsider pet removal after MVP launch; that would require a separate approved policy and implementation.

## Alternatives considered

1. Add reversible pet archival. This would need rules for task links, reminders, history, and custom fields, plus a migration and UI work.
2. Permit physical deletion. This would need a defined policy for linked tasks, history, custom fields, attachments, Storage cleanup, and recovery, plus an amendment to the L—6 decision.

The restriction avoids silently removing linked history or private files during the MVP.

## Consequences

No pet deletion action or schema change is included in L—15. Existing account deletion behavior is unchanged. Individual pet deletion is deferred until a future decision after MVP launch, if needed.
