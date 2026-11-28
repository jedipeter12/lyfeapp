# API 36 synthetic probe evidence

Captured on 2026-11-27/28 UTC from a Google APIs arm64 `KC3_API_36` emulator. Native Lyfe development build: `com.anonymous.lyfeapp`, `targetSdk=36`, `versionName=1.0.0`, Android notification permission granted, no exact-alarm permission declared. Expo 58.0.25 and `expo-notifications` 58.1.9 were installed from the repository lockfile. The isolated JS route in this directory was loaded through Metro into that build. No account or hosted data was used.

The following are selected, synthetic-only lines from the probe UI/Metro and Android `dumpsys` output. Full `dumpsys notification --noredact` output includes unrelated device notifications and is intentionally not committed. Each `when` is the Android notification's wall-clock timestamp in milliseconds since epoch. The report computes `when - dueAt`.

| Trial | ID suffix (`l22-probe-`) | Scheduled UTC | Due UTC | Android notification `when` | State evidence |
| --- | --- | --- | --- | ---: | --- |
| 1 | 1795817436076 | 2026-11-27T22:10:36.076Z | 2026-11-27T22:12:06.076Z | 1795817578744 | App displayed on screen |
| 2 | 1795817680546 | 2026-11-27T22:14:40.546Z | 2026-11-27T22:16:10.546Z | 1795817838091 | `input keyevent KEYCODE_HOME` after scheduling |
| 3 | 1795817868788 | 2026-11-27T22:17:48.788Z | 2026-11-27T22:19:18.788Z | 1795818026302 | `input keyevent KEYCODE_POWER`; `dumpsys power`: `mWakefulness=Asleep` |
| 4 | 1795818113991 | 2026-11-27T22:21:53.991Z | 2026-11-27T22:23:23.991Z | 1795818271496 | `dumpsys battery unplug`; `deviceidle force-idle`: `Now forced in to deep idle mode`; `mForceIdle=true`, `mState=IDLE` |
| 5 | 1795829269423 | 2026-11-28T01:27:49.423Z | 2026-11-28T01:29:19.423Z | 1795829427308 | Home, `am kill com.anonymous.lyfeapp`; `pidof` returned no PID |
| 6 | 1795834210904 | 2026-11-28T02:50:10.904Z | 2026-11-28T02:51:40.904Z | 1795834361698 | Home; `dumpsys power`: `mIsPowered=false`, `Battery Saver is currently: ON` before scheduling and while backgrounded |

For trials 1 and 2, `dumpsys alarm` showed `*walarm*:expo.modules.notifications.NOTIFICATION_EVENT`, `type=RTC_WAKEUP`, `window=+1m7s484ms` and `+1m7s483ms`, respectively, with a `broadcastIntent` PendingIntent. The probe returned `exactAlarmGranted=false` on each scheduling call. The installed package's `ExpoSchedulingDelegate.kt` selects `setAndAllowWhileIdle` in this state. One active notification record existed for each ID after delivery. No repeat trigger was requested. The battery-saver test ended with `cmd power set-mode 0` and `dumpsys battery reset`; the power dump then showed `Battery Saver is currently: OFF`, `mIsPowered=true`. The idle test ended with `deviceidle unforce` and `dumpsys battery reset`.

Some operations on this host incurred long diagnostic delays; state commands and their confirmation were completed before each due time, but the test did not continuously sample all power states. Repeating on a physical device with continuous host-side logging is necessary before making delivery claims.
