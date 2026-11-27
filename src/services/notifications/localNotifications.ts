import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { repositories } from "@/lib/supabase/repositories";
import {
  cancelForeignReminders,
  reconcileReminderPlans,
  type ReminderDevice,
} from "./reconcile";

const channelId = "task-reminders";
// The package re-exports these enums; the import resolver misses re-exports.
// eslint-disable-next-line import/namespace
const { AndroidImportance, IosAuthorizationStatus } = Notifications;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Task reminders",
      importance: AndroidImportance.DEFAULT,
    });
  }
}

async function hasPermission() {
  const status = await Notifications.getPermissionsAsync();
  return (
    status.granted || status.ios?.status === IosAuthorizationStatus.PROVISIONAL
  );
}

export async function requestReminderPermission() {
  await ensureChannel();
  if (await hasPermission()) return true;
  const status = await Notifications.requestPermissionsAsync();
  return (
    status.granted || status.ios?.status === IosAuthorizationStatus.PROVISIONAL
  );
}

const device: ReminderDevice = {
  async list() {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    return requests.map((request) => ({
      identifier: request.identifier,
      title: request.content.title,
      at:
        typeof request.content.data?.remindAt === "string"
          ? request.content.data.remindAt
          : null,
    }));
  },
  cancel: (identifier) =>
    Notifications.cancelScheduledNotificationAsync(identifier),
  async schedule(plan) {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: plan.identifier,
      content: {
        title: plan.title,
        body: "Task due now",
        data: { taskId: plan.taskId, userId: plan.userId, remindAt: plan.at },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(plan.at),
        ...(Platform.OS === "android" ? { channelId } : {}),
      },
    });
  },
};

let syncQueue = Promise.resolve();

export function reconcileLocalReminders(userId: string | null) {
  const run = async () => {
    await cancelForeignReminders(userId, device);
    if (!userId || !repositories) return;
    await ensureChannel();
    const permitted = await hasPermission();
    if (!permitted) {
      await reconcileReminderPlans(userId, [], [], false, device);
      return;
    }
    const reminders = await repositories.listPendingReminders(userId);
    const tasks = await repositories.listReminderTasks(
      userId,
      reminders.map((reminder) => reminder.task_id),
    );
    await reconcileReminderPlans(userId, reminders, tasks, true, device);
  };
  const result = syncQueue.then(run);
  syncQueue = result.catch(() => {});
  return result;
}
