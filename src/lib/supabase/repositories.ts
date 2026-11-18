import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  entitySchemas,
  profileRow,
  profileUpdate,
  type EntityCreate,
  type EntityRow,
  type EntityTable,
  type EntityUpdate,
  type Profile,
} from "@/schemas/entities";
import { supabase } from "./client";

export class OfflineWriteError extends Error {
  constructor() {
    super("Connect to the internet before saving changes.");
    this.name = "OfflineWriteError";
  }
}

type NetworkState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

export function createRepositories(
  client: SupabaseClient,
  networkState: () => Promise<NetworkState> = () => NetInfo.fetch(),
) {
  async function assertOnline() {
    const state = await networkState();
    if (state.isConnected !== true || state.isInternetReachable === false) {
      throw new OfflineWriteError();
    }
  }

  function parseOwned(schema: z.ZodType, data: unknown, userId: string) {
    const row = schema.parse(data);
    if ((row as { user_id: string }).user_id !== userId) {
      throw new Error("Unexpected record owner");
    }
    return row;
  }

  return {
    async getProfile(userId: string): Promise<Profile> {
      z.uuid().parse(userId);
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return parseOwned(profileRow, data, userId) as Profile;
    },

    async updateProfile(
      userId: string,
      changes: z.input<typeof profileUpdate>,
    ): Promise<Profile> {
      z.uuid().parse(userId);
      const payload = profileUpdate.parse(changes);
      if (Object.keys(payload).length === 0)
        throw new Error("No changes to save");
      await assertOnline();
      const { data, error } = await client
        .from("profiles")
        .update(payload)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;
      return parseOwned(profileRow, data, userId) as Profile;
    },

    async list<T extends EntityTable>(
      table: T,
      userId: string,
      page = 0,
    ): Promise<EntityRow<T>[]> {
      z.uuid().parse(userId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      const start = page * 100;
      let query = client.from(table).select("*").eq("user_id", userId);
      if (table === "tasks") query = query.is("deleted_at", null);
      const { data, error } = await query.order("id").range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) =>
        parseOwned(entitySchemas[table].row, value, userId),
      ) as EntityRow<T>[];
    },

    async listDeletedTasks(
      userId: string,
      page = 0,
    ): Promise<EntityRow<"tasks">[]> {
      z.uuid().parse(userId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      const start = page * 100;
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .not("deleted_at", "is", null)
        .order("id")
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) =>
        parseOwned(entitySchemas.tasks.row, value, userId),
      ) as EntityRow<"tasks">[];
    },

    async get<T extends EntityTable>(
      table: T,
      userId: string,
      id: string,
    ): Promise<EntityRow<T>> {
      z.uuid().parse(userId);
      z.uuid().parse(id);
      const { data, error } = await client
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .eq("id", id)
        .single();
      if (error) throw error;
      return parseOwned(entitySchemas[table].row, data, userId) as EntityRow<T>;
    },

    async create<T extends EntityTable>(
      table: T,
      userId: string,
      input: EntityCreate<T>,
    ): Promise<EntityRow<T>> {
      z.uuid().parse(userId);
      const payload = entitySchemas[table].create.parse(input);
      await assertOnline();
      const { data, error } = await client
        .from(table)
        .insert({ ...payload, user_id: userId })
        .select("*")
        .single();
      if (error) throw error;
      return parseOwned(entitySchemas[table].row, data, userId) as EntityRow<T>;
    },

    async update<T extends EntityTable>(
      table: T,
      userId: string,
      id: string,
      changes: EntityUpdate<T>,
    ): Promise<EntityRow<T>> {
      z.uuid().parse(userId);
      z.uuid().parse(id);
      const payload = entitySchemas[table].update.parse(changes);
      if (Object.keys(payload).length === 0)
        throw new Error("No changes to save");
      await assertOnline();
      const { data, error } = await client
        .from(table)
        .update(payload)
        .eq("user_id", userId)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return parseOwned(entitySchemas[table].row, data, userId) as EntityRow<T>;
    },

    async markTaskDeleted(
      userId: string,
      id: string,
    ): Promise<EntityRow<"tasks">> {
      z.uuid().parse(userId);
      z.uuid().parse(id);
      await assertOnline();
      const { data, error } = await client
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return parseOwned(
        entitySchemas.tasks.row,
        data,
        userId,
      ) as EntityRow<"tasks">;
    },

    async restoreTask(userId: string, id: string): Promise<EntityRow<"tasks">> {
      z.uuid().parse(userId);
      z.uuid().parse(id);
      await assertOnline();
      const { data, error } = await client
        .from("tasks")
        .update({ deleted_at: null })
        .eq("user_id", userId)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return parseOwned(
        entitySchemas.tasks.row,
        data,
        userId,
      ) as EntityRow<"tasks">;
    },
  };
}

export const repositories = supabase ? createRepositories(supabase) : null;
