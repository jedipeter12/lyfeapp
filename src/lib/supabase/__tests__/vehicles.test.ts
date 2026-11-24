import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepositories, OfflineWriteError } from "../repositories";

const userId = "11111111-1111-4111-8111-111111111111";
const vehicleId = "22222222-2222-4222-8222-222222222222";
const vehicle = {
  id: vehicleId,
  user_id: userId,
  year: 2021,
  make: "Example",
  model: "Sedan",
  vin: "AB12",
  current_mileage: 100,
};
const entry = {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: userId,
  vehicle_id: vehicleId,
  odometer: 101,
  recorded_at: "2026-11-24T12:00:00Z",
};

function fakeClient() {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [entry], error: null }),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: vehicle, error: null }),
  };
  const from = jest.fn().mockReturnValue(chain);
  return { client: { from } as unknown as SupabaseClient, chain, from };
}

const online = async () => ({ isConnected: true, isInternetReachable: true });

it("lists only the selected owner's vehicle mileage in stable pages", async () => {
  const { client, chain, from } = fakeClient();
  await expect(
    createRepositories(client, online).listVehicleMileage(userId, vehicleId, 1),
  ).resolves.toEqual([entry]);
  expect(from).toHaveBeenCalledWith("vehicles");
  expect(from).toHaveBeenCalledWith("vehicle_mileage_entries");
  expect(chain.eq).toHaveBeenCalledWith("user_id", userId);
  expect(chain.eq).toHaveBeenCalledWith("vehicle_id", vehicleId);
  expect(chain.range).toHaveBeenCalledWith(100, 199);
});

it("rejects foreign vehicle links and returned rows", async () => {
  const foreign = fakeClient();
  foreign.chain.single.mockResolvedValue({
    data: { ...vehicle, user_id: entry.id },
    error: null,
  });
  await expect(
    createRepositories(foreign.client, online).listVehicleMileage(
      userId,
      vehicleId,
    ),
  ).rejects.toThrow("Unexpected record owner");
  expect(foreign.from).not.toHaveBeenCalledWith("vehicle_mileage_entries");

  const wrongRow = fakeClient();
  wrongRow.chain.range.mockResolvedValue({
    data: [{ ...entry, vehicle_id: entry.id }],
    error: null,
  });
  await expect(
    createRepositories(wrongRow.client, online).listVehicleMileage(
      userId,
      vehicleId,
    ),
  ).rejects.toThrow("Unexpected vehicle link");
});

it("validates, online-checks, and inserts an owner-scoped reading", async () => {
  const { client, chain } = fakeClient();
  chain.single
    .mockResolvedValueOnce({ data: vehicle, error: null })
    .mockResolvedValueOnce({ data: entry, error: null });
  await expect(
    createRepositories(client, online).addVehicleMileage(userId, vehicleId, {
      odometer: 101,
      recorded_at: entry.recorded_at,
    }),
  ).resolves.toEqual(entry);
  expect(chain.insert).toHaveBeenCalledWith({
    odometer: 101,
    recorded_at: entry.recorded_at,
    user_id: userId,
    vehicle_id: vehicleId,
  });

  const offline = fakeClient();
  await expect(
    createRepositories(offline.client, async () => ({
      isConnected: false,
      isInternetReachable: false,
    })).addVehicleMileage(userId, vehicleId, {
      odometer: 101,
      recorded_at: entry.recorded_at,
    }),
  ).rejects.toBeInstanceOf(OfflineWriteError);
  expect(offline.from).not.toHaveBeenCalled();
});
