# ADR-006: retain restricted vehicle deletion

**Status:** Accepted by the owner, 2026-11-24.

## Context

L—17 asks for vehicle CRUD. The accepted L—6 restricted individual deletion decision denies authenticated `DELETE` on vehicles. Vehicles can have linked tasks, service records, mileage entries, attachments, and custom field values. Removing a vehicle could either leave references broken or discard history. No approved vehicle archive marker exists.

## Options

1. Keep vehicles without individual deletion in the MVP. Complete L—17's create, read, update, and mileage work, and change the ticket acceptance wording to reflect the accepted restriction.
2. Add reversible vehicle archiving with a new marker, filtering rules, restore UI, and explicit behavior for linked tasks and reminders. This requires a new approved migration and client work.
3. Allow permanent owner deletion with a deliberate dependent-record policy and private-file cleanup. This changes the accepted restriction and needs an approved architecture decision before implementation.

## Decision

Keep the existing L—6 restriction for L—17 and launch. Do not add vehicle deletion or archiving in this ticket. Reconsider after launch if users request it, with a separate decision and implementation that defines the behavior of linked records and private files.

## Consequences

Users can create and edit vehicle profiles and record mileage, but cannot remove a vehicle. L—17's acceptance criteria are interpreted as create, read, and update under this approved restriction. This decision does not change the account deletion requirement or approve any future vehicle deletion flow.
