# ADR-007: Optional Android exact-alarm access for task reminders

**Status:** Proposed, not approved. **Date:** 2026-11-28 UTC. **Related:** [L-22 investigation](../L22_ANDROID_REMINDER_LATENCY.md), [implementation plan](../L22_ANDROID_REMINDER_IMPLEMENTATION_PLAN.md), [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc).

## Context

Lyfe currently schedules due-time local notifications with Expo `DATE` triggers. The Android builds have no exact-alarm access; Expo 58.1.9 falls back to inexact `setAndAllowWhileIdle`. Six synthetic API 36 probes posted 53–68 seconds after due time, and two API 35 probes posted 28 and 68 seconds late; the earlier authenticated L-14 pass posted about 153 seconds late. These observations do not establish a worst case or explain the earlier magnitude.

Android allows tighter scheduling with `SCHEDULE_EXACT_ALARM`, but it is a special app access. Fresh installs on Android 14+ generally do not receive it automatically. It requires a user-facing justification, a fallback, and native/OEM testing. Expo's existing `bestEffort` path can use `setExactAndAllowWhileIdle` when access is granted, so a new scheduler is not the first step.

## Proposed decision

Choose one:

1. **Keep approximate reminders for MVP.** Retain the present manifest and Expo adapter, make the Android timing limitation clear in product wording, and gather physical-device evidence. No special access prompt.
2. **Approve optional exact-alarm access after validation.** Declare only `SCHEDULE_EXACT_ALARM`, ask contextually for special access with clear user value, and keep the inexact path when denied, unavailable, or revoked. Require a development-build comparison on API 35/36 and a physical Android device before release. Do not promise zero delay.

**Investigation recommendation:** Option 1 for the current release baseline. Consider option 2 if the owner decides that a tighter near-due reminder is core to Lyfe and the measured user benefit outweighs permission friction and battery cost. The owner must explicitly approve option 2 before any manifest or production scheduling change.

## Rejected alternatives for this scope

- `USE_EXACT_ALARM` is restricted by Google Play to dedicated alarm, timer, or calendar apps; Lyfe has broader life-maintenance scope.
- Expo `delivery: 'alarmClock'` adds a persistent alarm icon and higher urgency/battery cost. It would be disproportionate for general task reminders.
- A custom native scheduler would increase maintenance without evidence that Expo's exact path is insufficient.
- Push scheduling and iOS AlarmKit fall outside the approved local-notification baseline.

## Consequences and open evidence

Option 1 preserves current permissions but accepts late delivery. Option 2 adds a permission and an Android settings journey; denial and revocation must be normal, tested states. Physical-device results, longer Doze exposure, and permission-granted API 35/36 measurements remain outstanding. The [implementation plan](../L22_ANDROID_REMINDER_IMPLEMENTATION_PLAN.md) covers those tests and preserves reconcile/cancel/duplicate/timezone behavior.
