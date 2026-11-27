import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  entitySchemas,
  petWeightRow,
  type EntityRow,
} from "@/schemas/entities";
import {
  modulePreferenceRow,
  moduleType,
  reminderRow,
  type ModulePreference,
  type ModuleType,
} from "@/schemas/dashboard";
import { serviceRecordRow } from "@/schemas/vehicles";
import { OfflineWriteError } from "./repositories";
import { supabase } from "./client";

export type RecentRecord = {
  id: string;
  module: ModuleType;
  title: string;
  at: string;
};

export type Dashboard = {
  tasks: EntityRow<"tasks">[];
  reminders: { id: string; taskId: string; title: string; at: string }[];
  recent: RecentRecord[];
};

export function createDashboardRepository(
  client: SupabaseClient,
  networkState: () => Promise<{
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  }> = () => NetInfo.fetch(),
) {
  function owned<T extends { user_id: string }>(
    schema: z.ZodType<T>,
    rows: unknown[] | null,
    userId: string,
  ): T[] {
    return (rows ?? []).map((value) => {
      const row = schema.parse(value);
      if (row.user_id !== userId) throw new Error("Unexpected record owner");
      return row;
    });
  }

  return {
    async listPreferences(userId: string): Promise<ModulePreference[]> {
      z.uuid().parse(userId);
      const { data, error } = await client
        .from("module_preferences")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return owned(modulePreferenceRow, data, userId);
    },

    async setModuleEnabled(
      userId: string,
      module: ModuleType,
      enabled: boolean,
    ): Promise<ModulePreference> {
      z.uuid().parse(userId);
      moduleType.parse(module);
      z.boolean().parse(enabled);
      const state = await networkState();
      if (state.isConnected !== true || state.isInternetReachable === false)
        throw new OfflineWriteError();
      const existing = await client
        .from("module_preferences")
        .select("*")
        .eq("user_id", userId)
        .eq("module_type", module)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        const [row] = owned(modulePreferenceRow, [existing.data], userId);
        if (row.module_type !== module)
          throw new Error("Unexpected module preference");
      }
      const query = existing.data
        ? client
            .from("module_preferences")
            .update({ enabled })
            .eq("user_id", userId)
            .eq("module_type", module)
        : client
            .from("module_preferences")
            .insert({ user_id: userId, module_type: module, enabled });
      const { data, error } = await query.select("*").single();
      if (error) throw error;
      const [row] = owned(modulePreferenceRow, [data], userId);
      if (row.module_type !== module)
        throw new Error("Unexpected module preference");
      return row;
    },

    async getDashboard(userId: string, now = new Date()): Promise<Dashboard> {
      z.uuid().parse(userId);
      const [
        tasksResult,
        remindersResult,
        completedResult,
        weightsResult,
        servicesResult,
      ] = await Promise.all([
        client
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .is("completed_at", null)
          .not("due_at", "is", null)
          .order("due_at")
          .order("id")
          .limit(5),
        client
          .from("reminders")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "pending")
          .gte("remind_at", now.toISOString())
          .order("remind_at")
          .order("id")
          .limit(5),
        client
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(5),
        client
          .from("pet_weight_entries")
          .select("*")
          .eq("user_id", userId)
          .order("measured_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(5),
        client
          .from("vehicle_service_records")
          .select("*")
          .eq("user_id", userId)
          .order("performed_on", { ascending: false })
          .order("id", { ascending: false })
          .limit(5),
      ]);
      for (const result of [
        tasksResult,
        remindersResult,
        completedResult,
        weightsResult,
        servicesResult,
      ]) {
        if (result.error) throw result.error;
      }
      const tasks = owned(entitySchemas.tasks.row, tasksResult.data, userId);
      const reminders = owned(reminderRow, remindersResult.data, userId);
      const completed = owned(
        entitySchemas.tasks.row,
        completedResult.data,
        userId,
      );
      const weights = owned(petWeightRow, weightsResult.data, userId);
      const services = owned(serviceRecordRow, servicesResult.data, userId);
      const taskIds = reminders.map((item) => item.task_id);
      const petIds = [...new Set(weights.map((item) => item.pet_id))];
      const vehicleIds = [...new Set(services.map((item) => item.vehicle_id))];
      const [reminderTasks, petsResult, vehiclesResult] = await Promise.all([
        taskIds.length
          ? client
              .from("tasks")
              .select("*")
              .eq("user_id", userId)
              .is("deleted_at", null)
              .is("completed_at", null)
              .in("id", taskIds)
          : Promise.resolve({ data: [], error: null }),
        petIds.length
          ? client
              .from("pets")
              .select("id,user_id,name")
              .eq("user_id", userId)
              .in("id", petIds)
          : Promise.resolve({ data: [], error: null }),
        vehicleIds.length
          ? client
              .from("vehicles")
              .select("id,user_id,year,make,model")
              .eq("user_id", userId)
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const result of [reminderTasks, petsResult, vehiclesResult]) {
        if (result.error) throw result.error;
      }
      const titles = new Map(
        owned(entitySchemas.tasks.row, reminderTasks.data, userId).map(
          (task) => [task.id, task.title],
        ),
      );
      const petNames = new Map(
        owned(
          z.object({ id: z.uuid(), user_id: z.uuid(), name: z.string() }),
          petsResult.data,
          userId,
        ).map((pet) => [pet.id, pet.name]),
      );
      const vehicleNames = new Map(
        owned(
          z.object({
            id: z.uuid(),
            user_id: z.uuid(),
            year: z.number(),
            make: z.string(),
            model: z.string(),
          }),
          vehiclesResult.data,
          userId,
        ).map((vehicle) => [
          vehicle.id,
          `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        ]),
      );
      const recent: RecentRecord[] = [
        ...completed
          .filter((task) => task.completed_at)
          .map((task) => ({
            id: task.id,
            module: "tasks" as const,
            title: `Completed: ${task.title}`,
            at: task.completed_at!,
          })),
        ...weights
          .filter((weight) => petNames.has(weight.pet_id))
          .map((weight) => ({
            id: weight.id,
            module: "pets" as const,
            title: `${petNames.get(weight.pet_id)}: ${weight.weight_kg} kg`,
            at: weight.measured_at,
          })),
        ...services
          .filter((service) => vehicleNames.has(service.vehicle_id))
          .map((service) => ({
            id: service.id,
            module: "vehicles" as const,
            title: `${vehicleNames.get(service.vehicle_id)}: ${service.service_type}`,
            at: service.performed_on,
          })),
      ]
        .sort(
          (a, b) =>
            Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id),
        )
        .slice(0, 5);
      return {
        tasks,
        reminders: reminders
          .filter((item) => titles.has(item.task_id))
          .map((item) => ({
            id: item.id,
            taskId: item.task_id,
            title: titles.get(item.task_id)!,
            at: item.remind_at,
          })),
        recent,
      };
    },
  };
}

export const dashboardRepository = supabase
  ? createDashboardRepository(supabase)
  : null;
