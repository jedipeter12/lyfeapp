import type { EntityRow } from "@/schemas/entities";
import type { Reminder } from "@/schemas/reminders";

export type ScheduledReminder = {
  identifier: string;
  title: string | null;
  at: string | null;
};

export type ReminderDevice = {
  list(): Promise<ScheduledReminder[]>;
  cancel(identifier: string): Promise<void>;
  schedule(plan: {
    identifier: string;
    title: string;
    at: string;
    taskId: string;
    userId: string;
  }): Promise<void>;
};

export const reminderPrefix = "lyfe.reminder.";

export function reminderIdentifier(userId: string, reminderId: string) {
  return `${reminderPrefix}${userId}.${reminderId}`;
}

export async function cancelForeignReminders(
  userId: string | null,
  device: ReminderDevice,
) {
  const ownPrefix = userId ? `${reminderPrefix}${userId}.` : null;
  for (const item of await device.list()) {
    if (
      item.identifier.startsWith(reminderPrefix) &&
      (!ownPrefix || !item.identifier.startsWith(ownPrefix))
    ) {
      await device.cancel(item.identifier);
    }
  }
}

export async function reconcileReminderPlans(
  userId: string | null,
  reminders: Reminder[],
  tasks: EntityRow<"tasks">[],
  permitted: boolean,
  device: ReminderDevice,
  now = Date.now(),
) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const desired = new Map<
    string,
    {
      identifier: string;
      title: string;
      at: string;
      taskId: string;
      userId: string;
    }
  >();
  if (userId && permitted) {
    for (const reminder of reminders) {
      const task = taskById.get(reminder.task_id);
      if (
        reminder.user_id !== userId ||
        reminder.status !== "pending" ||
        !task ||
        task.user_id !== userId ||
        task.deleted_at ||
        task.completed_at ||
        !task.due_at ||
        new Date(task.due_at).getTime() <= now
      )
        continue;
      const identifier = reminderIdentifier(userId, reminder.id);
      desired.set(identifier, {
        identifier,
        title: task.title,
        at: task.due_at,
        taskId: task.id,
        userId,
      });
    }
  }

  const scheduled = (await device.list()).filter((item) =>
    item.identifier.startsWith(reminderPrefix),
  );
  const byIdentifier = new Map<string, ScheduledReminder[]>();
  for (const item of scheduled) {
    byIdentifier.set(item.identifier, [
      ...(byIdentifier.get(item.identifier) ?? []),
      item,
    ]);
  }
  const current = new Set<string>();
  for (const [identifier, requests] of byIdentifier) {
    const plan = desired.get(identifier);
    if (
      plan &&
      requests.length === 1 &&
      requests[0].at === plan.at &&
      requests[0].title === plan.title
    ) {
      current.add(identifier);
    } else {
      await device.cancel(identifier);
    }
  }
  for (const plan of desired.values()) {
    if (!current.has(plan.identifier)) await device.schedule(plan);
  }
}
