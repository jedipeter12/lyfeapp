# L-22: Android local reminder delivery latency

**Status:** Investigation on 2026-11-27. [L-22 ticket](https://app.notion.com/p/42535ab73db381339aade48c2785557d). This document does not change production scheduling or request a new permission.

## Baseline and confirmed scheduling path

- The merged [L-14 PR #24](https://github.com/jedipeter12/lyfeapp/pull/24) observed one API 36 reminder due at 17:41 UTC posting at about 17:43:33 UTC, about 153 seconds late. The source reports an approximate post time; it is one observation, not a distribution.
- `src/services/notifications/localNotifications.ts` schedules one-time `DATE` triggers from the task's UTC `due_at` through `expo-notifications`, on the `task-reminders` channel. The adapter does not set the Android `delivery` option, so the package default is `bestEffort`. Reconciliation maintains stable IDs and cancels stale/foreign schedules.
- Locked dependencies installed from `package-lock.json` for this investigation: Expo 58.0.25, `expo-notifications` 58.1.9, React Native 0.88.1. The locally installed Android development build targets API 36 and declares `POST_NOTIFICATIONS` (granted), but neither `SCHEDULE_EXACT_ALARM` nor `USE_EXACT_ALARM`.
- In `node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt`, `setupAlarm` checks `AlarmManager.canScheduleExactAlarms()`. When false, it calls `AlarmManagerCompat.setAndAllowWhileIdle(RTC_WAKEUP, ...)`; with access, `bestEffort` calls `setExactAndAllowWhileIdle`. The API 36 probe returned `exactAlarmGranted: false`, and `dumpsys alarm` identified an `RTC_WAKEUP` alarm with `window=+1m7s483ms`. **The current build therefore takes the inexact path.** This explains why due-time delivery is not guaranteed, but the exact cause of the earlier 153-second result is not established.

## Measurement method

The [isolated probe](../experiments/l22-probe/README.md) uses the same Expo `DATE` trigger and channel without Supabase data. On native API 35 and 36 emulators, it schedules one notification 90 seconds ahead and logs the scheduled and due UTC instants plus exact-alarm status. `adb shell dumpsys alarm` confirms the OS window. `adb shell dumpsys notification --noredact` supplies the posted notification and Android `when` timestamp. The `when` value is a close posting-time proxy, not an independent listener timestamp; Android's `posttimeElapsedMs` can be used with the alarm's RTC/elapsed mapping to cross-check it. One probe is scheduled per condition. Counts and ranges below apply only to these two emulators.

| Trial | Android API | State at due time | Due UTC | Android `when` UTC | Delta | Alarm window | Result |
| --- | ---: | --- | --- | --- | ---: | --- | --- |
| L-14 historical | 36 | State not fully recorded | 2026-11-27 17:41 approx. | 17:43:33 approx. | ~153 s | Inexact OS window | Posted |
| 1 | 36 | Foreground, screen on | 2026-11-27 22:12:06.076 | 22:12:58.744 | +52.668 s | +67.484 s | Posted once |
| 2 | 36 | App backgrounded with Home, screen on | 2026-11-27 22:16:10.546 | 22:17:18.091 | +67.545 s | +67.483 s | Posted once |
| 3 | 36 | App foreground when scheduled; screen off and `mWakefulness=Asleep` before due | 2026-11-27 22:19:18.788 | 22:20:26.302 | +67.514 s | Not captured | Posted once |
| 4 | 36 | Screen off, simulated unplugged, `deviceidle force-idle` returned deep idle and `mState=IDLE` | 2026-11-27 22:23:23.991 | 22:24:31.496 | +67.505 s | Not captured | Posted once |
| 5 | 36 | Backgrounded, process ended with `am kill` and `pidof` returned no PID | 2026-11-28 01:29:19.423 | 01:30:27.308 | +67.885 s | Not captured | Posted once |
| 6 | 36 | Backgrounded, screen on, simulated unplugged and Battery Saver ON | 2026-11-28 02:51:40.904 | 02:52:41.698 | +60.794 s | Not captured | Posted once |
| 7 | 35 | Foreground, screen on | 2026-11-28 04:10:11.242 | 04:10:39.078 | +27.836 s | +67.475 s | Posted once |
| 8 | 35 | App backgrounded with Home, screen on | 2026-11-28 04:12:44.260 | 04:13:51.789 | +67.529 s | +67.497 s | Posted once |

The eight synthetic IDs and selected Android diagnostics are in the [API 36](../experiments/l22-probe/API36_EVIDENCE.md) and [API 35](../experiments/l22-probe/API35_EVIDENCE.md) evidence logs. `dumpsys notification` showed one record per ID; no duplicate or miss was observed. Trials 2 and 8 posted about 62 ms and 32 ms beyond the reported alarm-window length; these diagnostic values are not formal Android delivery bounds. The trial 1 `when` timestamp and elapsed-post statistic differed by about 0.2 seconds after mapping RTC to elapsed time. Notification permission was granted and exact-alarm access unavailable. **The sample median was 67.510 seconds late; the largest fresh delay was 67.885 seconds.** Five results clustered around the end of the ~67.5-second inexact alarm window. This reproduces late posting but **does not reproduce** the earlier ~153-second magnitude. The earlier observation remains the largest recorded delay, but its conditions were not fully captured. These small emulator samples cannot establish a typical delay or worst case for users.

**Limits:** The available measurements cover Google APIs arm64 emulators on Android API 35 and 36 with the Lyfe build targeting SDK 36. No older Android version, physical/OEM device, long-duration Doze, force-stop, or population distribution has been measured. The screen-off test did not establish whether a secure keyguard was engaged. Ordinary background process termination was confirmed separately with `pidof`; force-stop has different Android semantics and was not substituted. Battery Saver was confirmed ON before scheduling trial 6 and OFF afterward. The probe covers native scheduling and posting, not Lyfe's authenticated server-to-device reconciliation. The L-14 end-to-end pass separately covered task opt-in, hosted pending row, due-time edit, and cancellation. The API 35/36 samples are too small and lack matched power states to infer an OS-version timing difference.

## Interpretation and options

Android [documents inexact alarms](https://developer.android.com/develop/background-work/services/alarms) as eligible for batching and further delay under Doze/battery restrictions. On Android 12+, `setAndAllowWhileIdle` normally fires within an hour without power restrictions; that is a platform statement, not a Lyfe SLA. [Expo SDK 58's notification API](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/) confirms that `bestEffort` uses exact scheduling when exact-alarm access exists and approximate scheduling otherwise. The local native source confirms the actual fallback in version 58.1.9.

| Approach | Timing and reliability | Permissions and user impact | Fit |
| --- | --- | --- | --- |
| Current `bestEffort`, no exact access | Inexact, may be late, including when app is backgrounded; preserves boot rescheduling through Expo | No new special permission or prompt; lower battery impact | Approved fallback and present behavior |
| Optional `SCHEDULE_EXACT_ALARM` with Expo `bestEffort` | Uses `setExactAndAllowWhileIdle` when granted; tighter on many devices, still subject to OEM/power behavior | Android 12+ special app access; denied by default for many fresh Android 14+ installs; must handle denial/revocation and explain battery tradeoff | Preferred candidate **only if the owner approves a new permission and due-time precision is a product requirement** |
| `delivery: 'alarmClock'` | Uses `setAlarmClock` with exact access; highest priority Android path, persistent status-bar alarm icon | Same special access plus conspicuous system UI and higher battery impact | Disproportionate for general maintenance reminders |
| `USE_EXACT_ALARM` | Exact access granted automatically | [Google Play restricts it](https://support.google.com/googleplay/android-developer/answer/16558241) to dedicated alarm, timer, or calendar core use cases | Do not adopt for Lyfe's current scope |
| Native custom scheduler / `OnAlarmListener` / WorkManager | Custom native code adds maintenance cost; listener exactness requires a live process; WorkManager is not a due-instant delivery mechanism | New native integration and testing burden | No evidence yet that it improves on Expo's existing adapter |

**Recommendation:** Keep the current architecture and describe Android reminders as approximate until the owner decides whether near-due precision justifies a special permission. If approved, prototype optional `SCHEDULE_EXACT_ALARM` access using Expo's existing adapter and compare granted versus denied timing on API 35/36 and a physical device before changing production behavior. Preserve the current inexact path whenever access is denied, revoked, or unavailable; never block task creation or reminder opt-in. Do not promise exact delivery under battery restrictions or across OEMs.

The [separate implementation plan](L22_ANDROID_REMINDER_IMPLEMENTATION_PLAN.md) specifies the conditional change, tests, rollout, and owner decision. [ADR-007](decisions/ADR-007-android-exact-alarm-permission-proposal.md) presents that decision for review. No production scheduling change has been made in L-22.
