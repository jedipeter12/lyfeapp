import { useState } from "react";
import { Button, ScrollView, Text } from "react-native";
import * as Notifications from "expo-notifications";

// Copy to app/l22-probe.tsx in an isolated checkout. Never ship this route.
// The package re-exports this enum; the import resolver misses re-exports.
// eslint-disable-next-line import/namespace
const { AndroidImportance } = Notifications;

export default function LatencyProbe() {
  const [result, setResult] = useState("Ready");

  const schedule = async () => {
    try {
      await Notifications.setNotificationChannelAsync("task-reminders", {
        name: "Task reminders",
        importance: AndroidImportance.DEFAULT,
      });
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) {
        const requested = await Notifications.requestPermissionsAsync();
        if (!requested.granted) {
          setResult("Notification permission denied");
          return;
        }
      }
      const exact = await Notifications.getExactAlarmPermissionsAsync();
      const scheduledAt = new Date();
      const dueAt = new Date(scheduledAt.getTime() + 90_000);
      const id = `l22-probe-${scheduledAt.getTime()}`;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: id,
          body: "L22 timing probe",
          data: { dueAt: dueAt.toISOString() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dueAt,
          channelId: "task-reminders",
        },
      });
      const line = JSON.stringify({
        id,
        scheduledAt: scheduledAt.toISOString(),
        dueAt: dueAt.toISOString(),
        exactAlarmGranted: exact.granted,
      });
      console.log(`L22_PROBE ${line}`);
      setResult(line);
    } catch (error) {
      setResult(String(error));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <Text>Android local reminder timing probe</Text>
      <Button title="Schedule one in 90 seconds" onPress={schedule} />
      <Text selectable>{result}</Text>
    </ScrollView>
  );
}
