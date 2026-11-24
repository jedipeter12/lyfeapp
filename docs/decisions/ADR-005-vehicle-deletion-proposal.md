# ADR-005 proposal: vehicle deletion

**Status:** Proposed for owner decision, 2026-11-24. No deletion behavior is implemented.

## Context

L—17 asks for vehicle CRUD. The accepted L—6 restricted individual deletion decision denies authenticated `DELETE` on vehicles. Vehicles can have linked tasks, service records, mileage entries, attachments, and custom field values. Removing a vehicle could either leave references broken or discard history. No approved vehicle archive marker exists.

## Options

1. Keep vehicles without individual deletion in the MVP. Complete L—17's create, read, update, and mileage work, and change the ticket acceptance wording to reflect the accepted restriction.
2. Add reversible vehicle archiving with a new marker, filtering rules, restore UI, and explicit behavior for linked tasks and reminders. This requires a new approved migration and client work.
3. Allow permanent owner deletion with a deliberate dependent-record policy and private-file cleanup. This changes the accepted restriction and needs an approved architecture decision before implementation.

## Recommendation

Choose option 1 for the current MVP. It preserves the accepted data retention behavior. The owner can approve a separate archive or deletion ticket when the behavior of linked records is defined.

## Consequences

Users can create and edit vehicle profiles and record mileage, but cannot remove a vehicle. The L—17 delete criterion remains unresolved until the owner chooses an option.
