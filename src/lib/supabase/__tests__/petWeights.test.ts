import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepositories, OfflineWriteError } from "../repositories";

const userId = "11111111-1111-4111-8111-111111111111";
const petId = "33333333-3333-4333-8333-333333333333";
const entryId = "55555555-5555-4555-8555-555555555555";
const entry = {
  id: entryId,
  user_id: userId,
  pet_id: petId,
  weight_kg: 4.25,
  measured_at: "2026-11-17T12:00:00+00:00",
};
const online = async () => ({ isConnected: true, isInternetReachable: true });

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
  return { client: { from } as unknown as SupabaseClient, chain, from };
}

describe("pet weight repository", () => {
  it("pages owner and pet filtered history newest first", async () => {
    const { client, chain, from } = fakeClient([entry]);
    await expect(
      createRepositories(client).listPetWeights(userId, petId, 1),
    ).resolves.toEqual([entry]);
    expect(from).toHaveBeenCalledWith("pet_weight_entries");
    expect(chain.eq).toHaveBeenCalledWith("user_id", userId);
    expect(chain.eq).toHaveBeenCalledWith("pet_id", petId);
    expect(chain.order).toHaveBeenCalledWith("measured_at", {
      ascending: false,
    });
    expect(chain.range).toHaveBeenCalledWith(100, 199);
  });

  it("rejects foreign owners and mismatched pet rows", async () => {
    const foreign = fakeClient([
      { ...entry, user_id: "22222222-2222-4222-8222-222222222222" },
    ]);
    await expect(
      createRepositories(foreign.client).listPetWeights(userId, petId),
    ).rejects.toThrow("Unexpected record owner");
    const wrongPet = fakeClient([
      { ...entry, pet_id: "44444444-4444-4444-8444-444444444444" },
    ]);
    await expect(
      createRepositories(wrongPet.client).listPetWeights(userId, petId),
    ).rejects.toThrow("Unexpected pet reference");
  });

  it("adds and corrects a weight with owner and pet filters", async () => {
    const { client, chain } = fakeClient(entry);
    const repo = createRepositories(client, online);
    const input = { weight_kg: 4.25, measured_at: entry.measured_at };
    await expect(repo.addPetWeight(userId, petId, input)).resolves.toEqual(
      entry,
    );
    expect(chain.insert).toHaveBeenCalledWith({
      ...input,
      user_id: userId,
      pet_id: petId,
    });
    await expect(
      repo.updatePetWeight(userId, petId, entryId, { weight_kg: 4.25 }),
    ).resolves.toEqual(entry);
    expect(chain.update).toHaveBeenCalledWith({ weight_kg: 4.25 });
    expect(chain.eq).toHaveBeenCalledWith("user_id", userId);
    expect(chain.eq).toHaveBeenCalledWith("pet_id", petId);
    expect(chain.eq).toHaveBeenCalledWith("id", entryId);
    await expect(
      repo.addPetWeight(userId, petId, { ...input, weight_kg: 0 }),
    ).rejects.toThrow();
  });

  it("rejects offline writes before contacting the client", async () => {
    const { client, from } = fakeClient(entry);
    const repo = createRepositories(client, async () => ({
      isConnected: false,
      isInternetReachable: false,
    }));
    await expect(
      repo.addPetWeight(userId, petId, {
        weight_kg: 4.25,
        measured_at: entry.measured_at,
      }),
    ).rejects.toBeInstanceOf(OfflineWriteError);
    expect(from).not.toHaveBeenCalled();
  });
});
