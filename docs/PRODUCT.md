# Product direction and MVP proposal

> Historical proposal. The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) defines the approved MVP: Tasks, Pets, Vehicles, and dashboard for individual accounts. Its scope supersedes conflicting exclusions below.

## Existing direction (from the original repository)

Lyfe helps busy adults manage recurring life administration: vehicle, home, appointment, financial, and similar responsibilities. A user records information about an obligation and its cadence so they need not remember it unaided. The product is a life maintenance system rather than a conventional habit tracker. The original document did **not** define an approved MVP, platform, privacy policy, or feature acceptance criteria.

Examples in the original text establish direction, not a commitment to every category or trigger type.

## Recommended smallest coherent MVP (pending owner approval)

**Target user:** A busy adult managing several recurring responsibilities for one household or self, initially on one device.

**Core problems:** Remembering what needs attention, knowing when it is due, retaining the last completion and useful context, and seeing what is overdue.

**Essential capabilities:**

1. Create, edit, pause, and discontinue a named maintenance item with an optional category and short note.
2. Set a date-based due rule: a single date, a fixed calendar interval, or an interval after completion. Show the rule in plain language before saving.
3. Record a completion with an effective date and optional note. Preserve history and compute the next due date deterministically.
4. Show upcoming and overdue items in one accessible list, with a clear empty state.
5. Configure one optional reminder per item if the chosen platform supports reliable local notifications. Denied notification permission must not hide due status in the app.
6. Export user data in a documented, portable format. Define recovery expectations before release.

**Proposed exclusions for first release:** Mileage or usage triggers, shared households, multi-device sync, accounts, cloud storage, attachments, medical records, financial integrations, AI suggestions, automatic service-provider integrations, and complex reminder escalation. These remain candidates for later releases, not rejected ideas.

### User journeys and observable behavior

| Journey | Expected behavior |
| --- | --- |
| Add an item | User enters title and due rule; app previews next due date and saves only valid input. |
| Check today | List separates overdue, due soon, and later items; each date is explicit, not conveyed by color alone. |
| Complete work | User records actual completion date; history remains visible; next due follows the selected rule, including early or late completion. |
| Change a rule | App previews the recalculated due date; past completion entries remain intact. |
| Pause or stop | Paused items retain data but do not generate active reminders; discontinued items remain in history unless explicitly deleted. |
| Recover data | User can export and understand what export includes and how restoration works. Restore flow needs a separate decision and test before release. |

### Accessibility and privacy requirements proposed for acceptance

- Support screen readers, logical focus order, text scaling, sufficient contrast, and touch targets appropriate to the chosen platform.
- Every action and due state has a text label. Notification permission is optional; critical information remains available in the app.
- Collect only fields needed for the feature. Avoid real personal data in fixtures, analytics, logs, and bug reports.
- Clearly disclose storage location, backup and export behavior, notification behavior, and deletion semantics before release.
- Treat notes as potentially sensitive even if the MVP avoids dedicated medical or financial fields.

## Owner decisions

See D1-D4 in `DECISIONS.md`. Confirm platform, data boundary, included recurrence rules, notification expectation, and allowed personal data before this proposal becomes a production specification.
