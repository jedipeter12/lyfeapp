# Decision log

## Approved MVP baseline

The owner-approved [Lyfe Architecture v1.0 (Frozen)](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) governs the MVP. It selects iOS and Android; React Native, Expo, Expo Router, and strict TypeScript; Supabase Auth, PostgreSQL, and private Storage; TanStack Query; Zod; and local notifications through an adapter. It defines the 16-table baseline, individual accounts, and online-first behavior. Changes to this baseline require an approved architecture decision record. The older proposals and open-choice table below predate that approval and do not override it.

The L—3 navigation skeleton does not implement authentication or authorize production infrastructure. Recurrence occurrence persistence and destructive-operation policy remain open as the frozen architecture states.

Ticket L—5 implements the approved Supabase Auth choice and introduces `profiles` as the first versioned baseline migration. It uses Expo SecureStore for persisted sessions and separate development/production client configuration. This implementation does not settle the remaining schema, recurrence, or destructive-operation decisions, and it does not authorize production provisioning.

## Accepted L—6 decision: restricted individual deletion

**Status:** Accepted by the owner, 2026-11-17. For the MVP, users may edit individual records and complete tasks, but the app does not offer deletion of individual tasks, pets, vehicles, or their child records. The authenticated role has no `DELETE` grant. Parent references use deferred `NO ACTION`, so a later deletion flow must explicitly handle linked tasks, history, custom fields, and attachments. There is no in-app archive behavior in this decision.

**Alternatives considered:** Archive and restore would need new state and behavior for linked records and reminders. Explicit cascading deletion would risk removing history and files unexpectedly. Restriction keeps the frozen 16-table baseline intact while those behaviors are designed separately.

**Consequences:** Users cannot remove mistaken or obsolete records in the MVP; they can edit records, and tasks can be completed. Archive or individual deletion requires a future product decision and migration. Account deletion remains a separate required workflow: remove owned Storage objects through the Storage API, then delete the Auth user so application rows cascade through `profiles`. L—6 does not implement that workflow. This decision does not authorize a hosted migration, merge, or release.

## Proposed amendment: task-only soft deletion

[ADR-001](decisions/ADR-001-task-soft-delete.md) proposes a reversible `tasks.deleted_at` marker so tasks can be hidden from default MVP views. It is not approved or deployed. The accepted L—6 restriction continues to govern until the owner approves the amendment and the query and notification behavior is implemented.

Record consequential product and technical decisions here with date, status, context, alternatives, reasoning, and consequences. Do not label a proposal as accepted merely because it appears in documentation or code.

## Historical audit record

No formal accepted decision entries existed at the start of the 2026-11-15 repository audit. The existing product direction is preserved in `PRODUCT.md`; its empty MVP and architecture fields do not imply approvals.

## Historical audit questions

The following questions were recorded before the frozen baseline. The baseline settled the platform, data boundary, MVP modules, and stack at a high level. Do not treat the recommendations below as current instructions.

| ID | Decision | Recommendation | Why it matters |
| --- | --- | --- | --- |
| D1 | First release platform: iOS, Android, both, or web | Choose one mobile platform for the first validated release, while keeping domain logic portable | Determines UI framework, notification APIs, testing, and cost |
| D2 | First release data boundary: on-device only or account-backed sync | Start on-device with export and a clear backup story if single-device use is acceptable | Determines identity, storage, recovery, and privacy design |
| D3 | MVP scheduling rules and reminder behavior | Start with date-based rules and one local reminder; defer usage triggers | Defines core behavior and test cases |
| D4 | What personal data may be stored in MVP | Minimize fields; defer medical details and document attachments | Affects security, privacy notices, and storage choice |
| D5 | Production framework and persistence implementation | Evaluate after D1-D4; choose the smallest maintained option | Avoids locking in infrastructure before requirements are set |

When a choice is made, replace its row with a dated accepted entry. Record alternatives and consequences at that time.
