# L-22: proposed Android reminder timing implementation

**Proposal only.** The [measurement report](L22_ANDROID_REMINDER_LATENCY.md) and [L-22 ticket](https://app.notion.com/p/42535ab73db381339aade48c2785557d) authorize investigation, not a production permission or scheduling change. The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc) keeps local Expo notifications behind the existing adapter.

## Decision before implementation

The owner must decide whether Android reminder wording should remain approximate or whether near-due delivery merits asking users for Android's **Alarms & reminders** special access. [ADR-007](decisions/ADR-007-android-exact-alarm-permission-proposal.md) presents the choice. An accepted ADR should define the product promise, permission eligibility rationale, denial behavior, and release criteria before adding `SCHEDULE_EXACT_ALARM` to the manifest. `USE_EXACT_ALARM`, a push backend, and alarm-clock UI are not proposed.

## Conditional implementation after approval

1. Add only `SCHEDULE_EXACT_ALARM` to the Android manifest through the Expo app configuration and verify the generated manifest in a native build. Keep iOS configuration unchanged. Do not add the permission to the L-22 measurement branch.
2. In `src/services/notifications/localNotifications.ts`, inspect `getExactAlarmPermissionsAsync()` after notification permission is granted. If the owner chose an opt-in flow, explain the benefit and power/permission tradeoff before calling `requestExactAlarmPermissionsAsync()`. Treat denial, settings-return without grant, and revocation as normal states. Keep the existing `DATE`/`bestEffort` trigger and `task-reminders` channel, since Expo selects the exact or inexact native API based on access.
3. On app foreground and permission return, run the existing `reconcileLocalReminders` path. Reschedule only where needed; keep stable IDs, stale/foreign cancellation, duplicate prevention, due-date edits, recurrence advancement, sign-out cleanup, and UTC/timezone behavior. Confirm native behavior when exact access is revoked or later granted; a scheduled alarm may need explicit cancel/reschedule even if the JS request appears unchanged.
4. In the Tasks reminder UI, clearly say that Android delivery may be approximate when special access is unavailable. Never imply the task itself failed to save. Keep task opt-in independent from exact-alarm access and avoid repeated permission prompts.
5. Update `docs/DEVELOPMENT.md` and the accepted decision record with the tested native behavior and release limits.

## Verification and rollout

- Unit tests: permission granted/denied/revoked, settings return, schedule/cancel/reconcile idempotency, due edit, recurrence, sign-out, and timezone transitions. Extend existing notification tests rather than mirroring implementation details.
- Native tests: API 35 and 36, normal notification permission granted/denied, exact access granted/denied/revoked, foreground/background/locked/idle/battery saver/ordinary process termination; separately document force-stop behavior. Capture UTC scheduled and posted times, alarm type/window, repeat/duplicate/miss counts, and logs. Run on at least one physical Android device for OEM/power behavior before any timing claim.
- Regression: iOS local reminder, hosted development reminder row, task edit/completion/soft deletion, recurrence advancement, two-account isolation, timezone/DST, and current CI quality gates. Use synthetic tasks; clean them up by exact ID and verify no residue.
- Rollout: first a development-only build, then owner-reviewed release. If exact access causes failures or unacceptable battery/user friction, leave or return to Expo's inexact path. Production release and any permission declaration require separate owner approval.

No permission, dependency, migration, or production code change is included in this investigation.
