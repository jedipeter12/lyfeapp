import type { SupabaseClient } from "@supabase/supabase-js";
import { createDashboardRepository } from "../dashboard";
import { OfflineWriteError } from "../repositories";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const taskId = "33333333-3333-4333-8333-333333333333";
const task = {
  id: taskId,
  user_id: userId,
  title: "Renew registration",
  description: null,
  status: "pending",
  priority: "medium",
  due_at: "2027-05-01T14:00:00.000Z",
  completed_at: null,
  deleted_at: null,
  pet_id: null,
  vehicle_id: null,
  created_at: "2027-04-01T14:00:00.000Z",
  updated_at: "2027-04-01T14:00:00.000Z",
};

function fakeClient(responses: Record<string, unknown[][]>) {
  const calls: { table: string; chain: Record<string, jest.Mock> }[] = [];
  const from = jest.fn((table: string) => {
    const data = responses[table]?.shift() ?? [];
    const result = { data, error: null };
    const chain = {} as Record<string, jest.Mock>;
    for (const method of [
      "select",
      "eq",
      "is",
      "not",
      "gte",
      "order",
      "update",
      "insert",
    ]) {
      chain[method] = jest.fn().mockReturnValue(chain);
    }
    chain.limit = jest.fn().mockResolvedValue(result);
    chain.in = jest.fn().mockResolvedValue(result);
    chain.single = jest.fn().mockResolvedValue({ data: data[0], error: null });
    chain.maybeSingle = jest
      .fn()
      .mockResolvedValue({ data: data[0] ?? null, error: null });
    chain.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
    calls.push({ table, chain });
    return chain;
  });
  return { client: { from } as unknown as SupabaseClient, calls };
}

describe("dashboard repository", () => {
  it("reads bounded owner-scoped data and combines recent records by event date", async () => {
    const reminder = {
      id: "44444444-4444-4444-8444-444444444444",
      user_id: userId,
      task_id: taskId,
      remind_at: "2027-04-30T14:00:00.000Z",
      status: "pending",
      created_at: "2027-04-01T14:00:00.000Z",
      updated_at: "2027-04-01T14:00:00.000Z",
    };
    const completed = {
      ...task,
      id: "55555555-5555-4555-8555-555555555555",
      title: "Wash car",
      status: "completed",
      completed_at: "2027-04-28T14:00:00.000Z",
    };
    const weight = {
      id: "66666666-6666-4666-8666-666666666666",
      user_id: userId,
      pet_id: "77777777-7777-4777-8777-777777777777",
      weight_kg: 4.2,
      measured_at: "2027-04-29T14:00:00.000Z",
    };
    const service = {
      id: "88888888-8888-4888-8888-888888888888",
      user_id: userId,
      vehicle_id: "99999999-9999-4999-8999-999999999999",
      service_type: "Oil change",
      performed_on: "2027-04-30",
      odometer: null,
      cost: null,
      currency_code: null,
    };
    const { client, calls } = fakeClient({
      tasks: [[task], [completed], [task]],
      reminders: [[reminder]],
      pet_weight_entries: [[weight]],
      vehicle_service_records: [[service]],
      pets: [[{ id: weight.pet_id, user_id: userId, name: "Milo" }]],
      vehicles: [
        [
          {
            id: service.vehicle_id,
            user_id: userId,
            year: 2020,
            make: "Example",
            model: "Car",
          },
        ],
      ],
    });
    const result = await createDashboardRepository(client).getDashboard(
      userId,
      new Date("2027-04-01T00:00:00.000Z"),
    );
    expect(result.tasks).toEqual([task]);
    expect(result.reminders).toEqual([
      { id: reminder.id, taskId, title: task.title, at: reminder.remind_at },
    ]);
    expect(result.recent.map((item) => item.module)).toEqual([
      "vehicles",
      "pets",
      "tasks",
    ]);
    expect(result.recent.map((item) => item.title)).toEqual([
      "2020 Example Car: Oil change",
      "Milo: 4.2 kg",
      "Completed: Wash car",
    ]);
    expect(calls).toHaveLength(8);
    for (const { chain } of calls) {
      expect(chain.eq).toHaveBeenCalledWith("user_id", userId);
    }
    expect(calls[0].chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(calls[0].chain.is).toHaveBeenCalledWith("completed_at", null);
    expect(calls[1].chain.gte).toHaveBeenCalledWith(
      "remind_at",
      "2027-04-01T00:00:00.000Z",
    );
    for (const { chain } of calls.slice(0, 5)) {
      expect(chain.limit).toHaveBeenCalledWith(5);
    }
  });

  it("rejects foreign preference rows and requires connectivity for writes", async () => {
    const row = {
      user_id: otherUserId,
      module_type: "pets",
      enabled: false,
      settings: {},
    };
    const foreign = fakeClient({ module_preferences: [[row]] });
    await expect(
      createDashboardRepository(foreign.client).listPreferences(userId),
    ).rejects.toThrow("Unexpected record owner");
    const offline = fakeClient({ module_preferences: [] });
    await expect(
      createDashboardRepository(offline.client, async () => ({
        isConnected: false,
        isInternetReachable: false,
      })).setModuleEnabled(userId, "pets", false),
    ).rejects.toBeInstanceOf(OfflineWriteError);
    expect(offline.calls).toHaveLength(0);
  });

  it("updates only the enabled column and inserts a missing preference", async () => {
    const row = {
      user_id: userId,
      module_type: "pets",
      enabled: false,
      settings: {},
    };
    const { client, calls } = fakeClient({
      module_preferences: [[row], [row]],
    });
    await expect(
      createDashboardRepository(client, async () => ({
        isConnected: true,
        isInternetReachable: true,
      })).setModuleEnabled(userId, "pets", false),
    ).resolves.toEqual(row);
    expect(calls[0].chain.eq).toHaveBeenCalledWith("user_id", userId);
    expect(calls[0].chain.eq).toHaveBeenCalledWith("module_type", "pets");
    expect(calls[1].chain.update).toHaveBeenCalledWith({ enabled: false });
    const missing = fakeClient({ module_preferences: [[], [row]] });
    await createDashboardRepository(missing.client, async () => ({
      isConnected: true,
      isInternetReachable: true,
    })).setModuleEnabled(userId, "pets", false);
    expect(missing.calls[1].chain.insert).toHaveBeenCalledWith({
      user_id: userId,
      module_type: "pets",
      enabled: false,
    });
  });
});
