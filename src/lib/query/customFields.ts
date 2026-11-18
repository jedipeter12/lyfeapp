import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories } from "@/lib/supabase/repositories";
import type {
  CustomFieldModule,
  CustomFieldValueInput,
  customFieldDefinitionCreate,
} from "@/schemas/customFields";
import type { z } from "zod";

function requiredRepositories() {
  if (!repositories) throw new Error("Supabase is not configured");
  return repositories;
}

export const customFieldKeys = {
  definitions: (userId: string, module: CustomFieldModule) =>
    ["user", userId, "custom-fields", module, "definitions"] as const,
  definitionList: (userId: string, module: CustomFieldModule, page: number) =>
    [...customFieldKeys.definitions(userId, module), page] as const,
  values: (userId: string, module: CustomFieldModule, entityId: string) =>
    ["user", userId, "custom-fields", module, "values", entityId] as const,
  valueList: (
    userId: string,
    module: CustomFieldModule,
    entityId: string,
    page: number,
  ) => [...customFieldKeys.values(userId, module, entityId), page] as const,
};

export function useCustomFieldDefinitions(
  module: CustomFieldModule,
  userId?: string,
  page = 0,
) {
  return useQuery({
    queryKey: customFieldKeys.definitionList(userId ?? "", module, page),
    queryFn: () =>
      requiredRepositories().listCustomFieldDefinitions(userId!, module, page),
    enabled: Boolean(userId && repositories),
  });
}

export function useCustomFieldValues(
  module: CustomFieldModule,
  userId?: string,
  entityId?: string,
  page = 0,
) {
  return useQuery({
    queryKey: customFieldKeys.valueList(
      userId ?? "",
      module,
      entityId ?? "",
      page,
    ),
    queryFn: () =>
      requiredRepositories().listCustomFieldValues(
        userId!,
        module,
        entityId!,
        page,
      ),
    enabled: Boolean(userId && entityId && repositories),
  });
}

export function useCreateCustomFieldDefinition(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: z.input<typeof customFieldDefinitionCreate>) =>
      requiredRepositories().createCustomFieldDefinition(userId, input),
    onSuccess: (definition) =>
      client.invalidateQueries({
        queryKey: customFieldKeys.definitions(userId, definition.module_type),
      }),
  });
}

export function useRenameCustomFieldDefinition(
  userId: string,
  module: CustomFieldModule,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      requiredRepositories().renameCustomFieldDefinition(
        userId,
        module,
        id,
        name,
      ),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: customFieldKeys.definitions(userId, module),
      }),
  });
}

export function useSaveCustomFieldValue(
  userId: string,
  module: CustomFieldModule,
  entityId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      definitionId,
      value,
    }: {
      definitionId: string;
      value: CustomFieldValueInput;
    }) =>
      requiredRepositories().saveCustomFieldValue(
        userId,
        module,
        entityId,
        definitionId,
        value,
      ),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: customFieldKeys.values(userId, module, entityId),
      }),
  });
}
