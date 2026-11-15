# Decision log

Record consequential product and technical decisions here with date, status, context, alternatives, reasoning, and consequences. Do not label a proposal as accepted merely because it appears in documentation or code.

## Accepted decisions

No formal accepted decision entries existed at the start of the 2026-11-15 repository audit. The existing product direction is preserved in `PRODUCT.md`; its empty MVP and architecture fields do not imply approvals.

## Decisions requested from the owner

| ID | Decision | Recommendation | Why it matters |
| --- | --- | --- | --- |
| D1 | First release platform: iOS, Android, both, or web | Choose one mobile platform for the first validated release, while keeping domain logic portable | Determines UI framework, notification APIs, testing, and cost |
| D2 | First release data boundary: on-device only or account-backed sync | Start on-device with export and a clear backup story if single-device use is acceptable | Determines identity, storage, recovery, and privacy design |
| D3 | MVP scheduling rules and reminder behavior | Start with date-based rules and one local reminder; defer usage triggers | Defines core behavior and test cases |
| D4 | What personal data may be stored in MVP | Minimize fields; defer medical details and document attachments | Affects security, privacy notices, and storage choice |
| D5 | Production framework and persistence implementation | Evaluate after D1-D4; choose the smallest maintained option | Avoids locking in infrastructure before requirements are set |

When a choice is made, replace its row with a dated accepted entry. Record alternatives and consequences at that time.
