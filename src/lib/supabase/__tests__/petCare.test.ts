import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepositories, OfflineWriteError } from "../repositories";

const userId = "11111111-1111-4111-8111-111111111111";
const petId = "33333333-3333-4333-8333-333333333333";
const entryId = "55555555-5555-4555-8555-555555555555";
const row = {
  id: entryId,
  user_id: userId,
  pet_id: petId,
  name: "Rabies",
  administered_on: "2026-11-01",
  due_on: "2027-11-01",
};

function fakeClient(data: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error: null }),
  };
  const from = jest.fn().mockReturnValue(chain);
  return { client: { from } as unknown as SupabaseClient, from, chain };
}

it("pages vaccination history with owner and pet filters", async () => {
  const { client, from, chain } = fakeClient([row]);
  await expect(
    createRepositories(client).listPetCare("vaccinations", userId, petId, 1),
  ).resolves.toEqual([row]);
  expect(from).toHaveBeenCalledWith("pet_vaccinations");
  expect(chain.eq).toHaveBeenCalledWith("user_id", userId);
  expect(chain.eq).toHaveBeenCalledWith("pet_id", petId);
  expect(chain.range).toHaveBeenCalledWith(100, 199);
});

it("rejects unexpected owners or pet links", async () => {
  const foreign = fakeClient([
    { ...row, user_id: "22222222-2222-4222-8222-222222222222" },
  ]);
  await expect(
    createRepositories(foreign.client).listPetCare(
      "vaccinations",
      userId,
      petId,
    ),
  ).rejects.toThrow("Unexpected record owner");
  const wrongPet = fakeClient([
    { ...row, pet_id: "44444444-4444-4444-8444-444444444444" },
  ]);
  await expect(
    createRepositories(wrongPet.client).listPetCare(
      "vaccinations",
      userId,
      petId,
    ),
  ).rejects.toThrow("Unexpected pet reference");
});

it("creates and corrects an owned vaccination without changing its link", async () => {
  const { client, chain } = fakeClient(row);
  const repo = createRepositories(client, async () => ({
    isConnected: true,
    isInternetReachable: true,
  }));
  const input = {
    name: "Rabies",
    administered_on: "2026-11-01",
    due_on: "2027-11-01",
  };
  await expect(
    repo.addPetCare("vaccinations", userId, petId, input),
  ).resolves.toEqual(row);
  expect(chain.insert).toHaveBeenCalledWith({
    ...input,
    user_id: userId,
    pet_id: petId,
  });
  await expect(
    repo.updatePetCare("vaccinations", userId, petId, entryId, input),
  ).resolves.toEqual(row);
  expect(chain.update).toHaveBeenCalledWith(input);
  expect(chain.eq).toHaveBeenCalledWith("id", entryId);
});

it("blocks offline writes before touching Supabase", async () => {
  const { client, from } = fakeClient(row);
  const repo = createRepositories(client, async () => ({
    isConnected: false,
    isInternetReachable: false,
  }));
  await expect(
    repo.addPetCare("vaccinations", userId, petId, {
      name: "Rabies",
      administered_on: null,
      due_on: "2027-11-01",
    }),
  ).rejects.toBeInstanceOf(OfflineWriteError);
  expect(from).not.toHaveBeenCalled();
});
