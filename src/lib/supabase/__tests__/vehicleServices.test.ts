import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepositories, OfflineWriteError } from "../repositories";

const userId = "11111111-1111-4111-8111-111111111111";
const vehicleId = "22222222-2222-4222-8222-222222222222";
const vehicle = {
  id: vehicleId,
  user_id: userId,
  year: 2021,
  make: "Example",
  model: "Car",
  vin: null,
  current_mileage: null,
};
const record = {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: userId,
  vehicle_id: vehicleId,
  service_type: "Oil",
  performed_on: "2026-11-24",
  odometer: null,
  cost: "42.50",
  currency_code: "USD",
};

function fakeClient() {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [record], error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: vehicle, error: null }),
    is: jest.fn().mockReturnThis(),
  };
  const from = jest.fn().mockReturnValue(chain);
  return { client: { from } as unknown as SupabaseClient, chain, from };
}
const online = async () => ({ isConnected: true, isInternetReachable: true });

it("lists paged service records for an owned vehicle and parses numeric cost", async () => {
  const { client, chain, from } = fakeClient();
  await expect(
    createRepositories(client, online).listVehicleServices(
      userId,
      vehicleId,
      1,
    ),
  ).resolves.toEqual([{ ...record, cost: 42.5 }]);
  expect(from).toHaveBeenCalledWith("vehicle_service_records");
  expect(chain.eq).toHaveBeenCalledWith("vehicle_id", vehicleId);
  expect(chain.range).toHaveBeenCalledWith(100, 199);
});

it("updates a service only with owner, vehicle, and record filters", async () => {
  const { client, chain } = fakeClient();
  chain.single
    .mockResolvedValueOnce({ data: vehicle, error: null })
    .mockResolvedValueOnce({ data: record, error: null });
  const input = {
    service_type: "Oil",
    performed_on: "2026-11-24",
    odometer: null,
    cost: 42.5,
    currency_code: "USD",
  };
  await expect(
    createRepositories(client, online).updateVehicleService(
      userId,
      vehicleId,
      record.id,
      input,
    ),
  ).resolves.toEqual({ ...record, cost: 42.5 });
  expect(chain.update).toHaveBeenCalledWith(input);
  expect(chain.eq).toHaveBeenCalledWith("user_id", userId);
  expect(chain.eq).toHaveBeenCalledWith("vehicle_id", vehicleId);
  expect(chain.eq).toHaveBeenCalledWith("id", record.id);
});

it("lists only active tasks linked to the owned vehicle", async () => {
  const task = {
    id: "44444444-4444-4444-8444-444444444444",
    user_id: userId,
    title: "Oil change",
    description: null,
    status: "pending",
    priority: "medium",
    due_at: null,
    completed_at: null,
    deleted_at: null,
    pet_id: null,
    vehicle_id: vehicleId,
    created_at: "2026-11-24T12:00:00Z",
    updated_at: "2026-11-24T12:00:00Z",
  };
  const { client, chain, from } = fakeClient();
  chain.range.mockResolvedValue({ data: [task], error: null });
  await expect(
    createRepositories(client, online).listVehicleTasks(userId, vehicleId),
  ).resolves.toEqual([task]);
  expect(from).toHaveBeenCalledWith("tasks");
  expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
  chain.range.mockResolvedValue({
    data: [{ ...task, vehicle_id: record.id }],
    error: null,
  });
  await expect(
    createRepositories(client, online).listVehicleTasks(userId, vehicleId),
  ).rejects.toThrow("Unexpected task link");
});

it("rejects a returned service linked to another vehicle", async () => {
  const { client, chain } = fakeClient();
  chain.range.mockResolvedValue({
    data: [{ ...record, vehicle_id: record.id }],
    error: null,
  });
  await expect(
    createRepositories(client, online).listVehicleServices(userId, vehicleId),
  ).rejects.toThrow("Unexpected vehicle link");
});

it("validates and inserts a service only while online", async () => {
  const { client, chain } = fakeClient();
  chain.single
    .mockResolvedValueOnce({ data: vehicle, error: null })
    .mockResolvedValueOnce({ data: record, error: null });
  const input = {
    service_type: "Oil",
    performed_on: "2026-11-24",
    odometer: null,
    cost: 42.5,
    currency_code: "USD",
  };
  await expect(
    createRepositories(client, online).addVehicleService(
      userId,
      vehicleId,
      input,
    ),
  ).resolves.toEqual({ ...record, cost: 42.5 });
  expect(chain.insert).toHaveBeenCalledWith({
    ...input,
    user_id: userId,
    vehicle_id: vehicleId,
  });
  const offline = fakeClient();
  await expect(
    createRepositories(offline.client, async () => ({
      isConnected: false,
      isInternetReachable: false,
    })).addVehicleService(userId, vehicleId, input),
  ).rejects.toBeInstanceOf(OfflineWriteError);
  expect(offline.from).not.toHaveBeenCalled();
});
