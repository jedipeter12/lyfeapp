import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardRepository } from "@/lib/supabase/dashboard";
import type { ModuleType } from "@/schemas/dashboard";

export const dashboardKeys = {
  data: (userId: string) => ["user", userId, "dashboard"] as const,
  preferences: (userId: string) =>
    ["user", userId, "module-preferences"] as const,
};

function requiredRepository() {
  if (!dashboardRepository) throw new Error("Supabase is not configured");
  return dashboardRepository;
}

export function useDashboard(userId?: string) {
  return useQuery({
    queryKey: dashboardKeys.data(userId ?? ""),
    queryFn: () => requiredRepository().getDashboard(userId!),
    enabled: Boolean(userId && dashboardRepository),
  });
}

export function useModulePreferences(userId?: string) {
  return useQuery({
    queryKey: dashboardKeys.preferences(userId ?? ""),
    queryFn: () => requiredRepository().listPreferences(userId!),
    enabled: Boolean(userId && dashboardRepository),
  });
}

export function useSetModuleEnabled(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      module,
      enabled,
    }: {
      module: ModuleType;
      enabled: boolean;
    }) => requiredRepository().setModuleEnabled(userId, module, enabled),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: dashboardKeys.preferences(userId) }),
  });
}
