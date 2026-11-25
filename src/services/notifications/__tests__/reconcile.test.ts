import {
  cancelForeignReminders,
  reconcileReminderPlans,
  reminderIdentifier,
  type ReminderDevice,
  type ScheduledReminder,
} from "../reconcile";
import type { EntityRow } from "@/schemas/entities";
import type { Reminder } from "@/schemas/reminders";

const userId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const reminderId = "33333333-3333-4333-8333-333333333333";
const at = "2027-03-14T14:00:00.000Z";
const task: EntityRow<"tasks"> = {
  id: taskId,
  user_id: userId,
  title: "Renew registration",
  description: null,
  status: "pending",
  priority: "medium",
  due_at: at,
  completed_at: null,
  deleted_at: null,
  pet_id: null,
  vehicle_id: null,
  created_at: at,
  updated_at: at,
};
const reminder: Reminder = {
  id: reminderId,
  user_id: userId,
  task_id: taskId,
  remind_at: at,
  status: "pending",
  created_at: at,
  updated_at: at,
};

function fakeDevice(scheduled: ScheduledReminder[] = []) {
  const device: ReminderDevice = {
    list: jest.fn().mockResolvedValue(scheduled),
    cancel: jest.fn().mockResolvedValue(undefined),
    schedule: jest.fn().mockResolvedValue(undefined),
  };
  return device;
}

it("schedules one notification at the task's current due instant", async () => {
  const device = fakeDevice();
  await reconcileReminderPlans(userId, [reminder], [task], true, device, 0);
  expect(device.schedule).toHaveBeenCalledWith({
    identifier: reminderIdentifier(userId, reminderId),
    title: task.title,
    at,
    taskId,
    userId,
  });
});

it("keeps a matching schedule and replaces a stale due time after DST", async () => {
  const identifier = reminderIdentifier(userId, reminderId);
  const matching = fakeDevice([{ identifier, title: task.title, at }]);
  await reconcileReminderPlans(userId, [reminder], [task], true, matching, 0);
  expect(matching.cancel).not.toHaveBeenCalled();
  expect(matching.schedule).not.toHaveBeenCalled();

  const stale = fakeDevice([
    { identifier, title: task.title, at: "2027-03-14T15:00:00.000Z" },
  ]);
  await reconcileReminderPlans(userId, [reminder], [task], true, stale, 0);
  expect(stale.cancel).toHaveBeenCalledWith(identifier);
  expect(stale.schedule).toHaveBeenCalledWith(
    expect.objectContaining({ identifier, at }),
  );
});

it("collapses duplicate device requests to one schedule", async () => {
  const identifier = reminderIdentifier(userId, reminderId);
  const request = { identifier, title: task.title, at };
  const device = fakeDevice([request, request]);
  await reconcileReminderPlans(userId, [reminder], [task], true, device, 0);
  expect(device.cancel).toHaveBeenCalledTimes(1);
  expect(device.cancel).toHaveBeenCalledWith(identifier);
  expect(device.schedule).toHaveBeenCalledTimes(1);
});

it("cancels reminders for completed tasks and a signed-out user", async () => {
  const identifier = reminderIdentifier(userId, reminderId);
  const oldUserIdentifier = reminderIdentifier(
    "44444444-4444-4444-8444-444444444444",
    reminderId,
  );
  const device = fakeDevice([
    { identifier, title: task.title, at },
    { identifier: oldUserIdentifier, title: "Private task", at },
  ]);
  await reconcileReminderPlans(
    userId,
    [reminder],
    [{ ...task, completed_at: at }],
    true,
    device,
    0,
  );
  expect(device.cancel).toHaveBeenCalledWith(identifier);
  expect(device.cancel).toHaveBeenCalledWith(oldUserIdentifier);
  expect(device.schedule).not.toHaveBeenCalled();

  const signOut = fakeDevice([{ identifier, title: task.title, at }]);
  await reconcileReminderPlans(null, [], [], false, signOut, 0);
  expect(signOut.cancel).toHaveBeenCalledWith(identifier);
});

it("clears a former account's schedule without needing a database read", async () => {
  const own = reminderIdentifier(userId, reminderId);
  const former = reminderIdentifier(
    "44444444-4444-4444-8444-444444444444",
    reminderId,
  );
  const device = fakeDevice([
    { identifier: own, title: task.title, at },
    { identifier: former, title: "Former account", at },
  ]);
  await cancelForeignReminders(userId, device);
  expect(device.cancel).toHaveBeenCalledTimes(1);
  expect(device.cancel).toHaveBeenCalledWith(former);
});

it("does not schedule when permission is denied or the due instant has passed", async () => {
  const denied = fakeDevice();
  await reconcileReminderPlans(userId, [reminder], [task], false, denied, 0);
  expect(denied.schedule).not.toHaveBeenCalled();

  const past = fakeDevice();
  await reconcileReminderPlans(
    userId,
    [reminder],
    [task],
    true,
    past,
    new Date(at).getTime() + 1,
  );
  expect(past.schedule).not.toHaveBeenCalled();
});
