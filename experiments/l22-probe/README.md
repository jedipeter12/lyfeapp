# L-22 Android timing probe

This isolated route calls the same Expo `DATE` trigger API and channel as the Lyfe adapter, without an account or hosted data. It does not declare or request exact alarm access. Do not ship the route.

In an isolated Lyfe checkout with dependencies installed and an API 36 native development build installed (build once with `npx expo run:android` if needed):

```bash
cp experiments/l22-probe/latency-probe.tsx app/l22-probe.tsx
EXPO_OFFLINE=1 npx expo start --localhost --port 8081
```

In a second terminal:

```bash
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d 'lyfe://l22-probe' com.anonymous.lyfeapp
```

Tap **Schedule one in 90 seconds** and record the `L22_PROBE` JSON from Metro, `adb shell dumpsys alarm`, and `adb shell dumpsys notification --noredact` after delivery. Match the notification `tag` to the probe ID. Convert the Android notification `when` epoch milliseconds to UTC and subtract `dueAt`; that `when` is a posting-time proxy. `posttimeElapsedMs` can cross-check it if correlated with Android's RTC/elapsed alarm mapping. Avoid committing full notification dumps, which may contain unrelated device data.

Run separate trials with the app foreground, background (`adb shell input keyevent KEYCODE_HOME`), screen off (`KEYCODE_POWER`; confirm `mWakefulness=Asleep`), idle (`dumpsys battery unplug`, `dumpsys deviceidle force-idle`; confirm `mState=IDLE`), and battery saver (`dumpsys battery unplug`, `cmd power set-mode 1`; confirm Battery Saver ON). For ordinary process termination, background the app, run `adb shell am kill com.anonymous.lyfeapp`, and confirm `adb shell pidof com.anonymous.lyfeapp` returns no PID. Do not use `am force-stop` as a proxy; it changes Android's package stopped state. Confirm each state *before* the due time. Restore with `dumpsys deviceidle unforce`, `cmd power set-mode 0`, and `dumpsys battery reset` as applicable.

Remove `app/l22-probe.tsx` before making a production build.
