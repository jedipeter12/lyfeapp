# ADR-005 proposal: individual pet deletion

**Status:** Proposed for owner decision, 2026-11-24. This is not an approved change.

## Context

Ticket L—15 asks for pet CRUD. The accepted L—6 policy explicitly forbids authenticated deletion of individual pets and their child records. Pets can have linked tasks, weight history, other health records, custom fields, and attachments. The L—15 implementation therefore supports creating, reading, and editing pets and weight entries, but does not expose deletion.

## Decision requested

Choose whether an individual pet should be removable in the MVP and what should happen to linked data. Options:

1. Keep the accepted restriction. Clarify L—15's "CRUD" wording so deletion is outside this ticket.
2. Add reversible pet archival. Define whether archived pets appear in task links, reminders, history, and custom fields, then approve a separate migration and UI ticket.
3. Permit physical deletion. Define the required unlinking or removal of tasks, history, custom fields, and attachments, plus Storage cleanup and recovery expectations. This requires an explicit amendment to the L—6 decision and separate implementation.

**Recommendation:** Keep restriction for L—15 and design archival separately if users need to hide obsolete pets. This avoids silently removing linked history or private files.

## Consequences while pending

No pet deletion action or schema change is included in L—15. Existing account deletion behavior is unchanged. The ticket cannot meet a literal deletion acceptance criterion until the owner resolves this conflict.
