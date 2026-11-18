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
const taskId = "44444444-4444-4444-8444-444444444444";
const task = {
  id: taskId,
  user_id: userId,
  title: "Renew registration",
  description: null,
  status: "pending",
  priority: "medium",
  due_at: null,
  completed_at: null,
  deleted_at: null,
  pet_id: null,
  vehicle_id: null,
  created_at: "2026-11-17T12:00:00+00:00",
  updated_at: "2026-11-17T12:00:00+00:00",
};

function fakeClient(data: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
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

  it("lists active tasks by default and marked tasks through the restore path", async () => {
    const active = fakeClient([task]);
    await expect(
      createRepositories(active.client).list("tasks", userId),
    ).resolves.toEqual([task]);
    expect(active.chain.is).toHaveBeenCalledWith("deleted_at", null);

    const marked = { ...task, deleted_at: "2026-11-18T12:00:00+00:00" };
    const deleted = fakeClient([marked]);
    await expect(
      createRepositories(deleted.client).listDeletedTasks(userId),
    ).resolves.toEqual([marked]);
    expect(deleted.chain.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(deleted.chain.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("marks and restores only the owner's task", async () => {
    const marked = { ...task, deleted_at: "2026-11-18T12:00:00+00:00" };
    const deleteClient = fakeClient(marked);
    const online = async () => ({
      isConnected: true,
      isInternetReachable: true,
    });
    await expect(
      createRepositories(deleteClient.client, online).markTaskDeleted(
        userId,
        taskId,
      ),
    ).resolves.toEqual(marked);
    expect(deleteClient.chain.update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
    });
    expect(
      Date.parse(deleteClient.chain.update.mock.calls[0][0].deleted_at),
    ).not.toBeNaN();
    expect(deleteClient.chain.eq).toHaveBeenCalledWith("user_id", userId);
    expect(deleteClient.chain.eq).toHaveBeenCalledWith("id", taskId);

    const restoreClient = fakeClient(task);
    await expect(
      createRepositories(restoreClient.client, online).restoreTask(
        userId,
        taskId,
      ),
    ).resolves.toEqual(task);
    expect(restoreClient.chain.update).toHaveBeenCalledWith({
      deleted_at: null,
    });
    expect(restoreClient.chain.eq).toHaveBeenCalledWith("user_id", userId);
    expect(restoreClient.chain.eq).toHaveBeenCalledWith("id", taskId);
  });

  it("keeps the marker out of ordinary task updates", async () => {
    const { client, chain } = fakeClient(task);
    const repository = createRepositories(client, async () => ({
      isConnected: true,
      isInternetReachable: true,
    }));
    await repository.update("tasks", userId, taskId, {
      title: "Renew registration soon",
      deleted_at: "2026-11-18T12:00:00+00:00",
    } as Parameters<typeof repository.update<"tasks">>[3]);
    expect(chain.update).toHaveBeenCalledWith({
      title: "Renew registration soon",
    });
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
    await expect(
      repository.markTaskDeleted(userId, taskId),
    ).rejects.toBeInstanceOf(OfflineWriteError);
    await expect(repository.restoreTask(userId, taskId)).rejects.toBeInstanceOf(
      OfflineWriteError,
    );
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
