# API 35 synthetic probe evidence

Captured on 2026-11-28 UTC from a temporary Google APIs arm64 `Lyfe_API_35` emulator. A native Lyfe development build was produced from this branch with `npx expo run:android --device emulator-5554 --no-bundler` (Gradle `BUILD SUCCESSFUL`) and loaded the isolated JS route through Metro. The build targets SDK 36 and declares no exact-alarm permission. The probe returned `exactAlarmGranted=false`; the notification permission was granted through Android's contextual system prompt. No account or hosted data was used.

Selected synthetic-only evidence from the probe and Android `dumpsys`:

| Trial | ID suffix (`l22-probe-`) | Scheduled UTC | Due UTC | Android notification `when` | Alarm window | State |
| --- | --- | --- | --- | ---: | --- | --- |
| 7 | 1795838921242 | 2026-11-28T04:08:41.242Z | 2026-11-28T04:10:11.242Z | 1795839039078 | +67.475 s | App foreground, screen on |
| 8 | 1795839074260 | 2026-11-28T04:11:14.260Z | 2026-11-28T04:12:44.260Z | 1795839231789 | +67.497 s | `input keyevent KEYCODE_HOME` after scheduling, screen on |

`dumpsys alarm` showed `*walarm*:expo.modules.notifications.NOTIFICATION_EVENT`, `type=RTC_WAKEUP`, and a `broadcastIntent` PendingIntent for both trials. `dumpsys notification --noredact` contained one active notification record per synthetic ID with the `when` values above. Full dumps were not committed because they include unrelated device notifications. No repeat trigger was requested, and no duplicate or miss was observed in these two trials.
