# Architecture: current state and proposal

> Historical audit proposal. The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) supersedes conflicting guidance here. Its approved stack is React Native, Expo, Expo Router, strict TypeScript, Supabase, TanStack Query, and Zod. Ticket L—3 adds only the Expo navigation skeleton; the remaining layers are future tickets.

## Current state

As audited on 2026-11-15, the repository has Markdown documentation, empty `src/` and `tests/` placeholders, a license, and Git configuration. There is no application code, server, database, authentication, API, analytics, deployment, or selected framework. The only executable repository tooling is the dependency-free documentation checker described in `DEVELOPMENT.md`. No approved technology choices were found in `DECISIONS.md`.

## Recommended shape (proposal, not a stack decision)

Use one client application with a small, pure domain layer for recurrence calculations, an explicit persistence interface, and a notification adapter. Keep due calculations independent of UI and storage so they can be tested with synthetic data. Version stored records and exports from the first release. No backend is necessary if the owner accepts single-device storage and its recovery tradeoff.

```text
UI → application use cases → domain rules
                    ↘ persistence interface → on-device store
                    ↘ reminder interface → platform notifications
                    ↘ export interface → user-controlled file
```

The diagram defines boundaries, not packages, framework, or database tables. `DOMAIN_MODEL.md` specifies proposed semantics.

## Alternatives and tradeoffs

| Concern | Simpler first-release option | Alternative and tradeoff |
| --- | --- | --- |
| Platform | One mobile OS first | Both mobile OSes or web broadens reach but increases UI and notification testing; web reminders have browser/device limits. |
| Data | On-device storage | Cloud sync improves recovery and multi-device use but adds identity, backend operations, security work, and recurring cost. |
| Accounts | None for single-device | Accounts are needed for private sync; passwordless or third-party auth still creates support and privacy obligations. |
| Offline | Local read/write by default | Server-first design needs conflict and outage handling. |
| Reminders | Local notifications derived from due state | Server push can reach multiple devices but needs a hosted scheduler, credentials, and delivery monitoring. Neither notification channel should be the only source of due state. |
| Attachments | None initially | Files introduce size, backup, encryption, and sensitive-content concerns. |
| Data portability | Versioned JSON or CSV export with schema documentation | A proprietary backup is simpler to implement but harder for users to inspect or migrate. |
| Future integrations | Manual entry initially | Vehicle, calendar, health, or finance integrations add data rights, consent, and maintenance cost. |

## Cross-cutting design constraints

- Store calendar due dates as dates and a user-selected time zone where needed. Store completion instants separately from the effective local completion date. Do not calculate calendar recurrence by adding fixed seconds.
- Persist source facts and rules; treat next due as derived state that can be rebuilt. Version rules so future semantic changes do not silently rewrite history.
- Keep notification scheduling idempotent and reconcile it after a rule edit, completion, permission change, or time-zone change. Display due state even when notification delivery fails.
- Validate imported data and rule limits. Do not log note content or export payloads. Use platform storage protections when a platform is chosen.
- Define export and restore, backup responsibility, deletion, and data retention before release. On-device only data can be lost if a device is lost or reset.
- Keep analytics absent by default unless a measurable need and consent design are approved.

## Testing and release path

Domain tests should cover the scenario table in `DOMAIN_MODEL.md`. Persistence and notification adapters need integration tests once a platform is chosen. A basic accessibility pass and restore rehearsal are release gates. CI currently validates repository documentation; it is not a production build or release pipeline.

## Decisions still open

D1-D5 in `DECISIONS.md` govern platform, storage, schedule scope, data sensitivity, and implementation stack. No cloud resources or migrations should be created before these choices and the domain model are accepted.
