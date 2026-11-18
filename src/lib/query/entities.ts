import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { repositories } from "@/lib/supabase/repositories";
import type {
  EntityCreate,
  EntityTable,
  EntityUpdate,
} from "@/schemas/entities";

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
  detail: (userId: string, table: EntityTable, id: string) =>
    [...entityKeys.all(userId, table), "detail", id] as const,
  profile: (userId: string) => ["user", userId, "profile"] as const,
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
