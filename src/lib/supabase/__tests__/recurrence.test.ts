import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepositories, OfflineWriteError } from "../repositories";
import type { EntityRow } from "@/schemas/entities";
import type { RecurrenceRule } from "@/schemas/recurrence";

const userId = "11111111-1111-4111-8111-111111111111";
const taskId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ruleId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const task: EntityRow<"tasks"> = {
  id: taskId,
  user_id: userId,
  title: "Synthetic task",
  description: null,
  status: "pending",
  priority: "medium",
  due_at: "2027-03-13T15:30:00.000Z",
  completed_at: null,
  deleted_at: null,
  pet_id: null,
  vehicle_id: null,
  created_at: "2027-01-01T00:00:00.000Z",
  updated_at: "2027-01-01T00:00:00.000Z",
};
const rule: RecurrenceRule = {
  id: ruleId,
  user_id: userId,
  task_id: taskId,
  frequency: "daily",
  interval: 1,
  weekdays: null,
  timezone: "America/Chicago",
  end_at: null,
  anchor_local_date: "2027-03-13",
  anchor_local_time: "09:30",
};
const online = async () => ({ isConnected: true, isInternetReachable: true });

it("submits the stable occurrence target and DST-aware next due in one RPC", async () => {
  const rpc = jest.fn().mockResolvedValue({
    data: {
      task: { ...task, due_at: "2027-03-14T14:30:00.000Z" },
      occurrence: {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        user_id: userId,
        task_id: taskId,
        recurrence_rule_id: ruleId,
        scheduled_local_date: "2027-03-13",
        scheduled_at: task.due_at,
        timezone: "America/Chicago",
        completed_at: "2027-03-13T16:00:00.000Z",
        created_at: "2027-03-13T16:00:00.000Z",
      },
    },
    error: null,
  });
  const repository = createRepositories(
    { rpc } as unknown as SupabaseClient,
    online,
  );
  await expect(
    repository.completeRecurringTask(userId, task, rule),
  ).resolves.toEqual(
    expect.objectContaining({
      occurrence: expect.objectContaining({
        scheduled_local_date: "2027-03-13",
      }),
    }),
  );
  expect(rpc).toHaveBeenCalledWith("complete_task_occurrence", {
    p_task_id: taskId,
    p_scheduled_local_date: "2027-03-13",
    p_scheduled_at: task.due_at,
    p_next_at: "2027-03-14T14:30:00.000Z",
  });
});

it("rejects offline and cross-owner completion before calling the database", async () => {
  const rpc = jest.fn();
  const offline = createRepositories(
    { rpc } as unknown as SupabaseClient,
    async () => ({ isConnected: false, isInternetReachable: false }),
  );
  await expect(
    offline.completeRecurringTask(userId, task, rule),
  ).rejects.toBeInstanceOf(OfflineWriteError);
  await expect(
    offline.completeRecurringTask(userId, task, {
      ...rule,
      user_id: "22222222-2222-4222-8222-222222222222",
    }),
  ).rejects.toThrow("owner");
  expect(rpc).not.toHaveBeenCalled();
});

it("creates a rule using the task's current due instant as its immutable anchor", async () => {
  const rpc = jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { ...rule, anchor_local_time: "09:30:00" },
      error: null,
    }),
  });
  const repository = createRepositories(
    { rpc } as unknown as SupabaseClient,
    online,
  );
  await expect(
    repository.saveTaskRecurrenceRule(userId, task, null, null, {
      frequency: "daily",
      interval: 1,
      weekdays: null,
      timezone: "America/Chicago",
      end_at: null,
    }),
  ).resolves.toEqual(rule);
  expect(rpc).toHaveBeenCalledWith(
    "save_recurrence_rule",
    expect.objectContaining({ p_task_id: taskId, p_next_at: task.due_at }),
  );
});
