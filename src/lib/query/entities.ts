import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { repositories } from "@/lib/supabase/repositories";
import type {
  EntityCreate,
  EntityRow,
  EntityTable,
  EntityUpdate,
} from "@/schemas/entities";
import type { RecurrenceRule, RecurrenceRuleInput } from "@/schemas/recurrence";

function requiredRepositories() {
  if (!repositories) throw new Error("Supabase is not configured");
  return repositories;
}

export const entityKeys = {
  all: (userId: string, table: EntityTable) => ["user", userId, table] as const,
  list: (userId: string, table: EntityTable, page: number) =>
    [...entityKeys.all(userId, table), "list", page] as const,
  deletedTasks: (userId: string, page: number) =>
    [...entityKeys.all(userId, "tasks"), "deleted", page] as const,
  tasksByCompletion: (
    userId: string,
    completion: "all" | "pending" | "completed",
    page: number,
  ) =>
    [
      ...entityKeys.all(userId, "tasks"),
      "completion",
      completion,
      page,
    ] as const,
  detail: (userId: string, table: EntityTable, id: string) =>
    [...entityKeys.all(userId, table), "detail", id] as const,
  profile: (userId: string) => ["user", userId, "profile"] as const,
  recurrenceRules: (userId: string) =>
    ["user", userId, "recurrence-rules"] as const,
  occurrenceHistory: (userId: string, taskId: string, page: number) =>
    ["user", userId, "task-occurrences", taskId, page] as const,
  vehicleMileage: (userId: string, vehicleId: string, page: number) =>
    ["user", userId, "vehicle-mileage", vehicleId, page] as const,
};

export function invalidateEntityQueries(
  client: QueryClient,
  userId: string,
  table: EntityTable,
) {
  return client.invalidateQueries({ queryKey: entityKeys.all(userId, table) });
}

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: entityKeys.profile(userId ?? ""),
    queryFn: () => requiredRepositories().getProfile(userId!),
    enabled: Boolean(userId && repositories),
  });
}

export function useUpdateProfile(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      changes: Parameters<
        ReturnType<typeof requiredRepositories>["updateProfile"]
      >[1],
    ) => requiredRepositories().updateProfile(userId, changes),
    onSuccess: (profile) => {
      client.setQueryData(entityKeys.profile(userId), profile);
    },
  });
}

export function useEntityList<T extends EntityTable>(
  table: T,
  userId?: string,
  page = 0,
) {
  return useQuery({
    queryKey: entityKeys.list(userId ?? "", table, page),
    queryFn: () => requiredRepositories().list(table, userId!, page),
    enabled: Boolean(userId && repositories),
  });
}

export function useDeletedTasks(userId?: string, page = 0) {
  return useQuery({
    queryKey: entityKeys.deletedTasks(userId ?? "", page),
    queryFn: () => requiredRepositories().listDeletedTasks(userId!, page),
    enabled: Boolean(userId && repositories),
  });
}

export function useTasksByCompletion(
  userId?: string,
  completion: "all" | "pending" | "completed" = "all",
  page = 0,
) {
  return useQuery({
    queryKey: entityKeys.tasksByCompletion(userId ?? "", completion, page),
    queryFn: () =>
      requiredRepositories().listTasksByCompletion(userId!, completion, page),
    enabled: Boolean(userId && repositories),
  });
}

export function useTaskRecurrenceRules(
  userId?: string,
  taskIds: string[] = [],
) {
  return useQuery({
    queryKey: [...entityKeys.recurrenceRules(userId ?? ""), ...taskIds],
    queryFn: () =>
      requiredRepositories().listTaskRecurrenceRules(userId!, taskIds),
    enabled: Boolean(userId && repositories && taskIds.length),
  });
}

export function useTaskOccurrenceHistory(
  userId?: string,
  taskId?: string,
  page = 0,
) {
  return useQuery({
    queryKey: entityKeys.occurrenceHistory(userId ?? "", taskId ?? "", page),
    queryFn: () =>
      requiredRepositories().listTaskOccurrences(userId!, taskId!, page),
    enabled: Boolean(userId && taskId && repositories),
  });
}

export function useSaveTaskRecurrenceRule(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      task,
      existing,
      lastCompletedDate,
      input,
    }: {
      task: EntityRow<"tasks">;
      existing: RecurrenceRule | null;
      lastCompletedDate: string | null;
      input: RecurrenceRuleInput;
    }) =>
      requiredRepositories().saveTaskRecurrenceRule(
        userId,
        task,
        existing,
        lastCompletedDate,
        input,
      ),
    onSuccess: async () => {
      await Promise.all([
        invalidateEntityQueries(client, userId, "tasks"),
        client.invalidateQueries({
          queryKey: entityKeys.recurrenceRules(userId),
        }),
      ]);
    },
  });
}

export function useCompleteRecurringTask(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      task,
      rule,
    }: {
      task: EntityRow<"tasks">;
      rule: RecurrenceRule;
    }) => requiredRepositories().completeRecurringTask(userId, task, rule),
    onSuccess: async (_, { task }) => {
      await Promise.all([
        invalidateEntityQueries(client, userId, "tasks"),
        client.invalidateQueries({
          queryKey: ["user", userId, "task-occurrences", task.id],
        }),
      ]);
    },
  });
}

export function useEntity<T extends EntityTable>(
  table: T,
  userId?: string,
  id?: string,
) {
  return useQuery({
    queryKey: entityKeys.detail(userId ?? "", table, id ?? ""),
    queryFn: () => requiredRepositories().get(table, userId!, id!),
    enabled: Boolean(userId && id && repositories),
  });
}

export function useVehicleMileage(
  userId?: string,
  vehicleId?: string,
  page = 0,
) {
  return useQuery({
    queryKey: entityKeys.vehicleMileage(userId ?? "", vehicleId ?? "", page),
    queryFn: () =>
      requiredRepositories().listVehicleMileage(userId!, vehicleId!, page),
    enabled: Boolean(userId && vehicleId && repositories),
  });
}

export function useAddVehicleMileage(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      vehicleId,
      odometer,
      recorded_at,
    }: {
      vehicleId: string;
      odometer: number;
      recorded_at: string;
    }) =>
      requiredRepositories().addVehicleMileage(userId, vehicleId, {
        odometer,
        recorded_at,
      }),
    onSuccess: (_, { vehicleId }) =>
      client.invalidateQueries({
        queryKey: ["user", userId, "vehicle-mileage", vehicleId],
      }),
  });
}

export function useCreateEntity<T extends EntityTable>(
  table: T,
  userId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: EntityCreate<T>) =>
      requiredRepositories().create(table, userId, input),
    onSuccess: () => invalidateEntityQueries(client, userId, table),
  });
}

export function useUpdateEntity<T extends EntityTable>(
  table: T,
  userId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: EntityUpdate<T> }) =>
      requiredRepositories().update(table, userId, id, changes),
    onSuccess: () => invalidateEntityQueries(client, userId, table),
  });
}

export function useMarkTaskDeleted(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      requiredRepositories().markTaskDeleted(userId, id),
    onSuccess: () => invalidateEntityQueries(client, userId, "tasks"),
  });
}

export function useRestoreTask(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requiredRepositories().restoreTask(userId, id),
    onSuccess: () => invalidateEntityQueries(client, userId, "tasks"),
  });
}
