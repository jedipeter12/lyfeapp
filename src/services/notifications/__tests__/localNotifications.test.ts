import { reconcileLocalReminders } from "../localNotifications";

const mockSetChannel = jest.fn();
const mockGetPermissions = jest.fn();
const mockListScheduled = jest.fn();
const mockSchedule = jest.fn();
const mockListReminders = jest.fn();
const mockListTasks = jest.fn();

jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 5 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetChannel(...args),
  getPermissionsAsync: () => mockGetPermissions(),
  getAllScheduledNotificationsAsync: () => mockListScheduled(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
}));
jest.mock("@/lib/supabase/repositories", () => ({
  repositories: {
    listPendingReminders: (...args: unknown[]) => mockListReminders(...args),
    listReminderTasks: (...args: unknown[]) => mockListTasks(...args),
  },
}));

const userId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const reminderId = "33333333-3333-4333-8333-333333333333";
const at = "2099-05-01T14:00:00.000Z";

beforeEach(() => {
  mockSetChannel.mockReset().mockResolvedValue({});
  mockGetPermissions.mockReset().mockResolvedValue({ granted: true });
  mockListScheduled.mockReset().mockResolvedValue([]);
  mockSchedule.mockReset().mockResolvedValue("scheduled");
  mockListReminders.mockReset().mockResolvedValue([
    {
      id: reminderId,
      user_id: userId,
      task_id: taskId,
      remind_at: at,
      status: "pending",
    },
  ]);
  mockListTasks.mockReset().mockResolvedValue([
    {
      id: taskId,
      user_id: userId,
      title: "QA task",
      due_at: at,
      completed_at: null,
      deleted_at: null,
    },
  ]);
});

it("creates the Android channel before checking permission and scheduling a shared reminder", async () => {
  await reconcileLocalReminders(userId);

  expect(mockSetChannel).toHaveBeenCalledWith("task-reminders", {
    name: "Task reminders",
    importance: 5,
  });
  expect(mockSetChannel.mock.invocationCallOrder[0]).toBeLessThan(
    mockGetPermissions.mock.invocationCallOrder[0],
  );
  expect(mockListReminders).toHaveBeenCalledWith(userId);
  expect(mockSchedule).toHaveBeenCalledWith(
    expect.objectContaining({
      identifier: `lyfe.reminder.${userId}.${reminderId}`,
    }),
  );
});
