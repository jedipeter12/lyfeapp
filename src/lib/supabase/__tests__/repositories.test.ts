import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepositories, OfflineWriteError } from "../repositories";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const petId = "33333333-3333-4333-8333-333333333333";
const pet = {
  id: petId,
  user_id: userId,
  name: "Milo",
  species: "cat",
  breed: null,
  birth_date: null,
  notes: null,
  created_at: "2026-11-17T12:00:00+00:00",
  updated_at: "2026-11-17T12:00:00+00:00",
};

function fakeClient(data: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data, error: null }),
    single: jest.fn().mockResolvedValue({ data, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  };
  const from = jest.fn().mockReturnValue(chain);
  return { client: { from } as unknown as SupabaseClient, chain, from };
}

describe("typed repositories", () => {
  it("validates read rows and scopes paged queries to the user", async () => {
    const { client, chain, from } = fakeClient([pet]);
    const repository = createRepositories(client);
    await expect(repository.list("pets", userId, 2)).resolves.toEqual([pet]);
    expect(from).toHaveBeenCalledWith("pets");
    expect(chain.eq).toHaveBeenCalledWith("user_id", userId);
    expect(chain.range).toHaveBeenCalledWith(200, 299);
  });

  it("rejects malformed and foreign rows from the data boundary", async () => {
    const bad = fakeClient([{ ...pet, user_id: otherUserId }]);
    await expect(
      createRepositories(bad.client).list("pets", userId),
    ).rejects.toThrow("Unexpected record owner");
    const malformed = fakeClient([{ ...pet, birth_date: "November 17" }]);
    await expect(
      createRepositories(malformed.client).list("pets", userId),
    ).rejects.toThrow();
  });

  it("rejects offline writes before contacting Supabase", async () => {
    const { client, from } = fakeClient(pet);
    const repository = createRepositories(client, async () => ({
      isConnected: false,
      isInternetReachable: false,
    }));
    await expect(
      repository.create("pets", userId, { name: "Milo", species: "cat" }),
    ).rejects.toBeInstanceOf(OfflineWriteError);
    expect(from).not.toHaveBeenCalled();
  });

  it("validates and limits write fields, then validates returned data", async () => {
    const { client, chain } = fakeClient(pet);
    const repository = createRepositories(client, async () => ({
      isConnected: true,
      isInternetReachable: true,
    }));
    await expect(
      repository.create("pets", userId, {
        name: " Milo ",
        species: "cat",
        user_id: otherUserId,
      } as Parameters<typeof repository.create<"pets">>[2]),
    ).resolves.toEqual(pet);
    expect(chain.insert).toHaveBeenCalledWith({
      name: "Milo",
      species: "cat",
      user_id: userId,
    });
    await expect(
      repository.update("pets", userId, petId, { name: "  " }),
    ).rejects.toThrow();
    expect(chain.update).not.toHaveBeenCalled();
  });
});
