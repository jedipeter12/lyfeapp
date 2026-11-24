import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  customFieldDefinitionCreate,
  customFieldDefinitionRow,
  customFieldDefinitionUpdate,
  customFieldModule,
  customFieldValueRow,
  parseCustomFieldValue,
  type CustomFieldDefinition,
  type CustomFieldModule,
  type CustomFieldValue,
} from "@/schemas/customFields";
import {
  entitySchemas,
  petWeightCreate,
  petWeightRow,
  petWeightUpdate,
  profileRow,
  profileUpdate,
  type EntityCreate,
  type EntityRow,
  type EntityTable,
  type EntityUpdate,
  type Profile,
  type PetWeightEntry,
} from "@/schemas/entities";
import { supabase } from "./client";
import {
  localDateAt,
  localTimeAt,
  nextOccurrence,
} from "@/features/tasks/recurrence";
import {
  recurrenceRuleInput,
  recurrenceRuleRow,
  taskOccurrenceRow,
  type RecurrenceRule,
  type RecurrenceRuleInput,
  type TaskOccurrence,
} from "@/schemas/recurrence";

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

    async listTasksByCompletion(
      userId: string,
      completion: "all" | "pending" | "completed",
      page = 0,
    ): Promise<EntityRow<"tasks">[]> {
      z.uuid().parse(userId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      const start = page * 100;
      let query = client
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null);
      if (completion === "pending") query = query.is("completed_at", null);
      if (completion === "completed")
        query = query.not("completed_at", "is", null);
      const { data, error } = await query.order("id").range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) =>
        parseOwned(entitySchemas.tasks.row, value, userId),
      ) as EntityRow<"tasks">[];
    },

    async listTaskRecurrenceRules(
      userId: string,
      taskIds: string[],
    ): Promise<RecurrenceRule[]> {
      z.uuid().parse(userId);
      if (!taskIds.length) return [];
      taskIds.forEach((id) => z.uuid().parse(id));
      const { data, error } = await client
        .from("recurrence_rules")
        .select("*")
        .eq("user_id", userId)
        .in("task_id", taskIds);
      if (error) throw error;
      return (data ?? []).map(
        (value) =>
          parseOwned(recurrenceRuleRow, value, userId) as RecurrenceRule,
      );
    },

    async listTaskOccurrences(
      userId: string,
      taskId: string,
      page = 0,
    ): Promise<TaskOccurrence[]> {
      z.uuid().parse(userId);
      z.uuid().parse(taskId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      const start = page * 100;
      const { data, error } = await client
        .from("task_occurrences")
        .select("*")
        .eq("user_id", userId)
        .eq("task_id", taskId)
        .order("scheduled_local_date", { ascending: false })
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map(
        (value) =>
          parseOwned(taskOccurrenceRow, value, userId) as TaskOccurrence,
      );
    },

    async saveTaskRecurrenceRule(
      userId: string,
      task: EntityRow<"tasks">,
      existing: RecurrenceRule | null,
      lastCompletedDate: string | null,
      input: RecurrenceRuleInput,
    ): Promise<RecurrenceRule> {
      z.uuid().parse(userId);
      if (
        task.user_id !== userId ||
        (existing &&
          (existing.user_id !== userId || existing.task_id !== task.id))
      )
        throw new Error("Unexpected record owner");
      if (!task.due_at)
        throw new Error("Set a due date before repeating a task.");
      const payload = recurrenceRuleInput.parse(input);
      const rule = {
        ...payload,
        anchor_local_date:
          existing?.anchor_local_date ??
          localDateAt(task.due_at, payload.timezone),
        anchor_local_time:
          existing?.anchor_local_time ??
          localTimeAt(task.due_at, payload.timezone),
      };
      const next = nextOccurrence(rule, lastCompletedDate);
      if (!next) throw new Error("The end date leaves no next occurrence.");
      await assertOnline();
      const { data, error } = await client
        .rpc("save_recurrence_rule", {
          p_task_id: task.id,
          p_frequency: payload.frequency,
          p_interval: payload.interval,
          p_weekdays: payload.weekdays,
          p_timezone: payload.timezone,
          p_end_at: payload.end_at,
          p_next_at: next.at,
        })
        .single();
      if (error) throw error;
      return parseOwned(recurrenceRuleRow, data, userId) as RecurrenceRule;
    },

    async completeRecurringTask(
      userId: string,
      task: EntityRow<"tasks">,
      rule: RecurrenceRule,
    ): Promise<{ task: EntityRow<"tasks">; occurrence: TaskOccurrence }> {
      z.uuid().parse(userId);
      if (
        task.user_id !== userId ||
        rule.user_id !== userId ||
        rule.task_id !== task.id
      )
        throw new Error("Unexpected record owner");
      if (!task.due_at) throw new Error("No recurring occurrence is due.");
      const localDate = localDateAt(task.due_at, rule.timezone);
      const next = nextOccurrence(rule, localDate);
      await assertOnline();
      const { data, error } = await client.rpc("complete_task_occurrence", {
        p_task_id: task.id,
        p_scheduled_local_date: localDate,
        p_scheduled_at: task.due_at,
        p_next_at: next?.at ?? null,
      });
      if (error) throw error;
      const result = z
        .object({
          task: entitySchemas.tasks.row,
          occurrence: taskOccurrenceRow,
        })
        .parse(data);
      if (
        result.task.user_id !== userId ||
        result.occurrence.user_id !== userId
      )
        throw new Error("Unexpected record owner");
      return result;
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

    async listPetWeights(
      userId: string,
      petId: string,
      page = 0,
    ): Promise<PetWeightEntry[]> {
      z.uuid().parse(userId);
      z.uuid().parse(petId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      const start = page * 100;
      const { data, error } = await client
        .from("pet_weight_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .order("measured_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) => {
        const entry = parseOwned(petWeightRow, value, userId) as PetWeightEntry;
        if (entry.pet_id !== petId) throw new Error("Unexpected pet reference");
        return entry;
      });
    },

    async addPetWeight(
      userId: string,
      petId: string,
      input: z.input<typeof petWeightCreate>,
    ): Promise<PetWeightEntry> {
      z.uuid().parse(userId);
      z.uuid().parse(petId);
      const payload = petWeightCreate.parse(input);
      await assertOnline();
      const { data, error } = await client
        .from("pet_weight_entries")
        .insert({ ...payload, user_id: userId, pet_id: petId })
        .select("*")
        .single();
      if (error) throw error;
      const entry = parseOwned(petWeightRow, data, userId) as PetWeightEntry;
      if (entry.pet_id !== petId) throw new Error("Unexpected pet reference");
      return entry;
    },

    async updatePetWeight(
      userId: string,
      petId: string,
      entryId: string,
      changes: z.input<typeof petWeightUpdate>,
    ): Promise<PetWeightEntry> {
      z.uuid().parse(userId);
      z.uuid().parse(petId);
      z.uuid().parse(entryId);
      const payload = petWeightUpdate.parse(changes);
      if (Object.keys(payload).length === 0)
        throw new Error("No changes to save");
      await assertOnline();
      const { data, error } = await client
        .from("pet_weight_entries")
        .update(payload)
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .eq("id", entryId)
        .select("*")
        .single();
      if (error) throw error;
      const entry = parseOwned(petWeightRow, data, userId) as PetWeightEntry;
      if (entry.pet_id !== petId || entry.id !== entryId)
        throw new Error("Unexpected pet reference");
      return entry;
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

    async listCustomFieldDefinitions(
      userId: string,
      module: CustomFieldModule,
      page = 0,
    ): Promise<CustomFieldDefinition[]> {
      z.uuid().parse(userId);
      customFieldModule.parse(module);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      const start = page * 100;
      const { data, error } = await client
        .from("custom_field_definitions")
        .select("*")
        .eq("user_id", userId)
        .eq("module_type", module)
        .order("id")
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) => {
        const definition = parseOwned(
          customFieldDefinitionRow,
          value,
          userId,
        ) as CustomFieldDefinition;
        if (definition.module_type !== module)
          throw new Error("Unexpected custom field module");
        return definition;
      });
    },

    async getCustomFieldDefinition(
      userId: string,
      module: CustomFieldModule,
      definitionId: string,
    ): Promise<CustomFieldDefinition> {
      z.uuid().parse(userId);
      customFieldModule.parse(module);
      z.uuid().parse(definitionId);
      const { data, error } = await client
        .from("custom_field_definitions")
        .select("*")
        .eq("user_id", userId)
        .eq("module_type", module)
        .eq("id", definitionId)
        .single();
      if (error) throw error;
      const definition = parseOwned(
        customFieldDefinitionRow,
        data,
        userId,
      ) as CustomFieldDefinition;
      if (definition.module_type !== module)
        throw new Error("Unexpected custom field module");
      return definition;
    },

    async createCustomFieldDefinition(
      userId: string,
      input: z.input<typeof customFieldDefinitionCreate>,
    ): Promise<CustomFieldDefinition> {
      z.uuid().parse(userId);
      const payload = customFieldDefinitionCreate.parse(input);
      await assertOnline();
      const { data, error } = await client
        .from("custom_field_definitions")
        .insert({ ...payload, user_id: userId })
        .select("*")
        .single();
      if (error) throw error;
      const definition = parseOwned(
        customFieldDefinitionRow,
        data,
        userId,
      ) as CustomFieldDefinition;
      if (definition.module_type !== payload.module_type)
        throw new Error("Unexpected custom field module");
      return definition;
    },

    async renameCustomFieldDefinition(
      userId: string,
      module: CustomFieldModule,
      definitionId: string,
      name: string,
    ): Promise<CustomFieldDefinition> {
      z.uuid().parse(userId);
      customFieldModule.parse(module);
      z.uuid().parse(definitionId);
      const payload = customFieldDefinitionUpdate.parse({ name });
      await assertOnline();
      const { data, error } = await client
        .from("custom_field_definitions")
        .update(payload)
        .eq("user_id", userId)
        .eq("module_type", module)
        .eq("id", definitionId)
        .select("*")
        .single();
      if (error) throw error;
      const definition = parseOwned(
        customFieldDefinitionRow,
        data,
        userId,
      ) as CustomFieldDefinition;
      if (definition.module_type !== module)
        throw new Error("Unexpected custom field module");
      return definition;
    },

    async listCustomFieldValues(
      userId: string,
      module: CustomFieldModule,
      entityId: string,
      page = 0,
    ): Promise<CustomFieldValue[]> {
      z.uuid().parse(userId);
      customFieldModule.parse(module);
      z.uuid().parse(entityId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      await this.get(module, userId, entityId);
      const start = page * 100;
      const { data, error } = await client
        .from("custom_field_values")
        .select("*")
        .eq("user_id", userId)
        .eq("entity_id", entityId)
        .order("id")
        .range(start, start + 99);
      if (error) throw error;
      const values = (data ?? []).map((value) => {
        const row = parseOwned(
          customFieldValueRow,
          value,
          userId,
        ) as CustomFieldValue;
        if (row.entity_id !== entityId)
          throw new Error("Unexpected custom field entity");
        return row;
      });
      if (values.length === 0) return values;
      const { data: definitionData, error: definitionError } = await client
        .from("custom_field_definitions")
        .select("*")
        .eq("user_id", userId)
        .eq("module_type", module)
        .in(
          "id",
          values.map((value) => value.definition_id),
        );
      if (definitionError) throw definitionError;
      const definitions = new Map(
        (definitionData ?? []).map((value) => {
          const definition = parseOwned(
            customFieldDefinitionRow,
            value,
            userId,
          ) as CustomFieldDefinition;
          if (definition.module_type !== module)
            throw new Error("Unexpected custom field module");
          return [definition.id, definition] as const;
        }),
      );
      for (const value of values) {
        const definition = definitions.get(value.definition_id);
        if (!definition) throw new Error("Custom field definition unavailable");
        parseCustomFieldValue(definition, value.value);
      }
      return values;
    },

    async saveCustomFieldValue(
      userId: string,
      module: CustomFieldModule,
      entityId: string,
      definitionId: string,
      value: unknown,
    ): Promise<CustomFieldValue> {
      z.uuid().parse(userId);
      customFieldModule.parse(module);
      z.uuid().parse(entityId);
      z.uuid().parse(definitionId);
      await assertOnline();
      const [definition] = await Promise.all([
        this.getCustomFieldDefinition(userId, module, definitionId),
        this.get(module, userId, entityId),
      ]);
      const parsedValue = parseCustomFieldValue(definition, value);
      const { data: current, error: readError } = await client
        .from("custom_field_values")
        .select("*")
        .eq("user_id", userId)
        .eq("definition_id", definitionId)
        .eq("entity_id", entityId)
        .maybeSingle();
      if (readError) throw readError;
      if (current) {
        const previous = parseOwned(
          customFieldValueRow,
          current,
          userId,
        ) as CustomFieldValue;
        if (
          previous.definition_id !== definitionId ||
          previous.entity_id !== entityId
        )
          throw new Error("Unexpected custom field reference");
      }
      const write = current
        ? client
            .from("custom_field_values")
            .update({ value: parsedValue })
            .eq("user_id", userId)
            .eq("id", (current as CustomFieldValue).id)
        : client.from("custom_field_values").insert({
            user_id: userId,
            definition_id: definitionId,
            entity_id: entityId,
            value: parsedValue,
          });
      const { data, error } = await write.select("*").single();
      if (error) throw error;
      const row = parseOwned(
        customFieldValueRow,
        data,
        userId,
      ) as CustomFieldValue;
      if (row.definition_id !== definitionId || row.entity_id !== entityId)
        throw new Error("Unexpected custom field reference");
      parseCustomFieldValue(definition, row.value);
      return row;
    },
  };
}

export const repositories = supabase ? createRepositories(supabase) : null;
