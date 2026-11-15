# Proposed life maintenance domain model

> Historical prototype proposal. The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) governs the production data model. Recurrence occurrence persistence remains an explicit decision before implementation.

**Status:** Design proposal, not an approved production schema. This is a testable specification for prototypes. Production persistence and migrations wait for owner acceptance of D1-D4.

## Concepts

| Concept | Proposed fields and invariants |
| --- | --- |
| Maintenance item / obligation | Stable ID, title, optional category and asset reference, status (active, paused, discontinued), created time, optional note, rule ID. Title cannot be blank. A discontinued item retains history. |
| Category and asset | Optional labels/references such as Vehicle / Car A. Avoid a mandatory category hierarchy in MVP. Assets may later hold a usage meter. |
| Recurrence rule | Versioned type, anchor date, interval and unit where relevant, time zone, and explicit policy for end-of-month and leap day. Exactly one active rule per item. |
| Completion / service event | Stable ID, item ID, effective local date, recorded instant, optional note and observed usage, correction metadata. Keep entries immutable in principle; corrections should be traceable. |
| Due occurrence | Derived date and reason (initial, fixed interval, or after completion); status is upcoming, due today, or overdue relative to a supplied local 'today'. Do not rely on a mutable stored due date alone. |
| Reminder | Optional offset and local delivery preference tied to an item; scheduled notification IDs are replaceable adapter state, not domain truth. |
| Preferences | Display time zone, due-soon window, notification preferences, export metadata. Changes in time zone need an explicit recalculation policy. |
| Supporting document | Future concept only; no attachments in proposed MVP. |

## Proposed recurrence semantics for prototype tests

- A date-only obligation has one due date. Completing it marks that occurrence done; it does not invent another due date.
- A **fixed calendar** rule is anchored to an original local date. Occurrences are calculated from that anchor, so early or late completion does not move the cadence. For monthly/yearly rules, calculate each occurrence from the original anchor and occurrence index, not by repeatedly adding to a clamped date.
- An **after-completion** rule uses the latest effective completion date as the next anchor. The first due date uses the entered initial date when there is no history. A late or early completion moves the next due date accordingly.
- Proposed calendar policy: if the target month lacks the anchor day, clamp to its last day. For Feb 29 yearly recurrence, use Feb 28 in non-leap years and Feb 29 in leap years. This policy needs owner acceptance.
- Dates are local calendar dates. Compare due date to 'today' in the item's selected time zone. A due date has no UTC midnight conversion. Notification delivery time is a separate local-time preference; daylight-saving gaps/overlaps use the platform's documented resolution policy and require adapter tests.
- If history is missing for an after-completion rule, show the initial due date and an 'unknown last completion' indication. Never infer a past service from the next due date.
- Paused and discontinued items retain calculated history but are omitted from active due and reminder queues. Re-activation recalculates from the rule and history.
- Usage-based triggers are a future extension: meter unit, monotonic readings, threshold basis, and unknown-reading behavior must be specified before implementation. A date/usage 'whichever first' rule is not implied.
- Edits to rules must preview and record the new effective rule version. Historical completions remain linked to the item and are not rewritten.

## Example scenarios to test

| Rule and history | Evaluation date | Expected result under proposal |
| --- | --- | --- |
| One-time 2027-05-01, no completion | 2027-05-02 | Overdue by one calendar day |
| One-time 2027-05-01, completed 2027-04-28 | 2027-05-02 | Done; no next occurrence |
| Fixed monthly, anchor 2027-01-31, completed Jan 25 | 2027-02-01 | Next due Feb 28, independent of early completion |
| Fixed monthly, anchor 2027-01-31 | 2027-03-01 | March occurrence Mar 31; no permanent drift to the 28th |
| Fixed yearly, anchor 2028-02-29 | 2029-02-28 | Due Feb 28; 2032 occurrence is Feb 29 |
| Every 30 days after completion, last done 2027-04-10 | 2027-05-11 | Next due May 10, overdue by one calendar day |
| Every 30 days after completion, due May 10, done May 15 | 2027-05-16 | Next due Jun 14, based on actual completion |
| Every 30 days after completion, due May 10, done May 01 | 2027-05-02 | Next due May 31, based on early completion |
| After-completion rule, no history, initial due 2027-06-01 | 2027-06-02 | Overdue; last completion unknown |
| Monthly item paused while overdue | 2027-06-02 | No active due or reminder; history retained |
| Date-only due 2027-03-14 in America/Chicago | 2027-03-14 | Due today across DST transition; no 23/25-hour date drift |
| Usage threshold 5,000 miles, no reading | Any | Unknown, never falsely marked due or complete |

Open semantics: how fixed occurrences are marked complete when multiple were missed; whether an early completion satisfies the upcoming fixed occurrence; time-zone changes; reminder lead time and delivery time; rule corrections and deletion; meter rollover. Resolve these before production behavior is finalized.
