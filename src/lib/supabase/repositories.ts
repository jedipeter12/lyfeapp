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
  petCareSchemas,
  type PetCareInput,
  type PetCareKind,
  type PetCareRow,
} from "@/schemas/petCare";
import {
  mileageEntryCreate,
  mileageEntryRow,
  type MileageEntry,
  serviceRecordCreate,
  serviceRecordRow,
  type ServiceRecord,
} from "@/schemas/vehicles";
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
import { reminderRow, type Reminder } from "@/schemas/reminders";

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

    async listTaskReminders(
      userId: string,
      taskIds: string[],
    ): Promise<Reminder[]> {
      z.uuid().parse(userId);
      if (!taskIds.length) return [];
      taskIds.forEach((id) => z.uuid().parse(id));
      const { data, error } = await client
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .in("task_id", taskIds);
      if (error) throw error;
      return (data ?? []).map((value) =>
        parseOwned(reminderRow, value, userId),
      ) as Reminder[];
    },

    async listPendingReminders(userId: string): Promise<Reminder[]> {
      z.uuid().parse(userId);
      const reminders: Reminder[] = [];
      for (let start = 0; ; start += 100) {
        const { data, error } = await client
          .from("reminders")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("id")
          .range(start, start + 99);
        if (error) throw error;
        reminders.push(
          ...(data ?? []).map(
            (value) => parseOwned(reminderRow, value, userId) as Reminder,
          ),
        );
        if (!data || data.length < 100) return reminders;
      }
    },

    async listReminderTasks(
      userId: string,
      taskIds: string[],
    ): Promise<EntityRow<"tasks">[]> {
      z.uuid().parse(userId);
      if (!taskIds.length) return [];
      taskIds.forEach((id) => z.uuid().parse(id));
      const tasks: EntityRow<"tasks">[] = [];
      for (let start = 0; start < taskIds.length; start += 100) {
        const { data, error } = await client
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .in("id", taskIds.slice(start, start + 100));
        if (error) throw error;
        tasks.push(
          ...(data ?? []).map(
            (value) =>
              parseOwned(
                entitySchemas.tasks.row,
                value,
                userId,
              ) as EntityRow<"tasks">,
          ),
        );
      }
      return tasks;
    },

    async enableTaskReminder(
      userId: string,
      taskId: string,
    ): Promise<Reminder> {
      z.uuid().parse(userId);
      z.uuid().parse(taskId);
      await assertOnline();
      const task = await this.get("tasks", userId, taskId);
      if (task.deleted_at || task.completed_at || !task.due_at)
        throw new Error("Set an active due date before enabling a reminder.");
      if (new Date(task.due_at).getTime() <= Date.now())
        throw new Error("Set a future due date before enabling a reminder.");
      const { data: existing, error: lookupError } = await client
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("task_id", taskId)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (lookupError) throw lookupError;
      const row = existing?.[0];
      if (row?.status === "pending" && row.remind_at === task.due_at)
        return parseOwned(reminderRow, row, userId) as Reminder;
      const request = row
        ? client
            .from("reminders")
            .update({ remind_at: task.due_at, status: "pending" })
            .eq("user_id", userId)
            .eq("task_id", taskId)
            .eq("id", row.id)
        : client.from("reminders").insert({
            user_id: userId,
            task_id: taskId,
            remind_at: task.due_at,
            status: "pending",
          });
      const { data, error } = await request.select("*").single();
      if (error) {
        if (error.code === "23505") {
          const current = await this.listTaskReminders(userId, [taskId]);
          if (current[0]) return current[0];
        }
        throw error;
      }
      return parseOwned(reminderRow, data, userId) as Reminder;
    },

    async disableTaskReminder(userId: string, taskId: string): Promise<void> {
      z.uuid().parse(userId);
      z.uuid().parse(taskId);
      await assertOnline();
      const { error } = await client
        .from("reminders")
        .update({ status: "cancelled" })
        .eq("user_id", userId)
        .eq("task_id", taskId)
        .eq("status", "pending");
      if (error) throw error;
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

    async listVehicleMileage(
      userId: string,
      vehicleId: string,
      page = 0,
    ): Promise<MileageEntry[]> {
      z.uuid().parse(userId);
      z.uuid().parse(vehicleId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      await this.get("vehicles", userId, vehicleId);
      const start = page * 100;
      const { data, error } = await client
        .from("vehicle_mileage_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("vehicle_id", vehicleId)
        .order("recorded_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) => {
        const entry = parseOwned(
          mileageEntryRow,
          value,
          userId,
        ) as MileageEntry;
        if (entry.vehicle_id !== vehicleId)
          throw new Error("Unexpected vehicle link");
        return entry;
      });
    },

    async addVehicleMileage(
      userId: string,
      vehicleId: string,
      input: z.input<typeof mileageEntryCreate>,
    ): Promise<MileageEntry> {
      z.uuid().parse(userId);
      z.uuid().parse(vehicleId);
      const payload = mileageEntryCreate.parse(input);
      await assertOnline();
      await this.get("vehicles", userId, vehicleId);
      const { data, error } = await client
        .from("vehicle_mileage_entries")
        .insert({ ...payload, user_id: userId, vehicle_id: vehicleId })
        .select("*")
        .single();
      if (error) throw error;
      const entry = parseOwned(mileageEntryRow, data, userId) as MileageEntry;
      if (entry.vehicle_id !== vehicleId)
        throw new Error("Unexpected vehicle link");
      return entry;
    },

    async listVehicleServices(
      userId: string,
      vehicleId: string,
      page = 0,
    ): Promise<ServiceRecord[]> {
      z.uuid().parse(userId);
      z.uuid().parse(vehicleId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      await this.get("vehicles", userId, vehicleId);
      const start = page * 100;
      const { data, error } = await client
        .from("vehicle_service_records")
        .select("*")
        .eq("user_id", userId)
        .eq("vehicle_id", vehicleId)
        .order("performed_on", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) => {
        const record = parseOwned(
          serviceRecordRow,
          value,
          userId,
        ) as ServiceRecord;
        if (record.vehicle_id !== vehicleId)
          throw new Error("Unexpected vehicle link");
        return record;
      });
    },

    async addVehicleService(
      userId: string,
      vehicleId: string,
      input: z.input<typeof serviceRecordCreate>,
    ): Promise<ServiceRecord> {
      z.uuid().parse(userId);
      z.uuid().parse(vehicleId);
      const payload = serviceRecordCreate.parse(input);
      await assertOnline();
      await this.get("vehicles", userId, vehicleId);
      const { data, error } = await client
        .from("vehicle_service_records")
        .insert({ ...payload, user_id: userId, vehicle_id: vehicleId })
        .select("*")
        .single();
      if (error) throw error;
      const record = parseOwned(
        serviceRecordRow,
        data,
        userId,
      ) as ServiceRecord;
      if (record.vehicle_id !== vehicleId)
        throw new Error("Unexpected vehicle link");
      return record;
    },

    async updateVehicleService(
      userId: string,
      vehicleId: string,
      recordId: string,
      input: z.input<typeof serviceRecordCreate>,
    ): Promise<ServiceRecord> {
      z.uuid().parse(userId);
      z.uuid().parse(vehicleId);
      z.uuid().parse(recordId);
      const payload = serviceRecordCreate.parse(input);
      await assertOnline();
      await this.get("vehicles", userId, vehicleId);
      const { data, error } = await client
        .from("vehicle_service_records")
        .update(payload)
        .eq("user_id", userId)
        .eq("vehicle_id", vehicleId)
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw error;
      const record = parseOwned(
        serviceRecordRow,
        data,
        userId,
      ) as ServiceRecord;
      if (record.vehicle_id !== vehicleId)
        throw new Error("Unexpected vehicle link");
      return record;
    },

    async listVehicleTasks(
      userId: string,
      vehicleId: string,
      page = 0,
    ): Promise<EntityRow<"tasks">[]> {
      z.uuid().parse(userId);
      z.uuid().parse(vehicleId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      await this.get("vehicles", userId, vehicleId);
      const start = page * 100;
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("vehicle_id", vehicleId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) => {
        const task = parseOwned(
          entitySchemas.tasks.row,
          value,
          userId,
        ) as EntityRow<"tasks">;
        if (task.vehicle_id !== vehicleId || task.deleted_at)
          throw new Error("Unexpected task link");
        return task;
      });
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

    async listPetCare<K extends PetCareKind>(
      kind: K,
      userId: string,
      petId: string,
      page = 0,
    ): Promise<PetCareRow<K>[]> {
      z.uuid().parse(userId);
      z.uuid().parse(petId);
      if (!Number.isSafeInteger(page) || page < 0)
        throw new Error("Invalid page");
      const schema = petCareSchemas[kind];
      const start = page * 100;
      const { data, error } = await client
        .from(schema.table)
        .select("*")
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .order(schema.order, { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + 99);
      if (error) throw error;
      return (data ?? []).map((value) => {
        const row = parseOwned(schema.row, value, userId) as PetCareRow<K>;
        if (row.pet_id !== petId) throw new Error("Unexpected pet reference");
        return row;
      });
    },

    async addPetCare<K extends PetCareKind>(
      kind: K,
      userId: string,
      petId: string,
      input: PetCareInput<K>,
    ): Promise<PetCareRow<K>> {
      z.uuid().parse(userId);
      z.uuid().parse(petId);
      const schema = petCareSchemas[kind];
      const payload = schema.input.parse(input);
      await assertOnline();
      const { data, error } = await client
        .from(schema.table)
        .insert({ ...payload, user_id: userId, pet_id: petId })
        .select("*")
        .single();
      if (error) throw error;
      const row = parseOwned(schema.row, data, userId) as PetCareRow<K>;
      if (row.pet_id !== petId) throw new Error("Unexpected pet reference");
      return row;
    },

    async updatePetCare<K extends PetCareKind>(
      kind: K,
      userId: string,
      petId: string,
      entryId: string,
      changes: PetCareInput<K>,
    ): Promise<PetCareRow<K>> {
      z.uuid().parse(userId);
      z.uuid().parse(petId);
      z.uuid().parse(entryId);
      const schema = petCareSchemas[kind];
      const payload = schema.input.parse(changes);
      await assertOnline();
      const { data, error } = await client
        .from(schema.table)
        .update(payload)
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .eq("id", entryId)
        .select("*")
        .single();
      if (error) throw error;
      const row = parseOwned(schema.row, data, userId) as PetCareRow<K>;
      if (row.pet_id !== petId || row.id !== entryId)
        throw new Error("Unexpected pet reference");
      return row;
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
