import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepositories, OfflineWriteError } from "../repositories";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const entityId = "33333333-3333-4333-8333-333333333333";
const definitionId = "44444444-4444-4444-8444-444444444444";
const valueId = "55555555-5555-4555-8555-555555555555";
const definition = {
  id: definitionId,
  user_id: userId,
  module_type: "pets",
  name: "Color",
  field_type: "single-select",
  config: { options: ["brown", "black"] },
};
const pet = {
  id: entityId,
  user_id: userId,
  name: "Fictional pet",
  species: "dog",
  breed: null,
  birth_date: null,
  notes: null,
  created_at: "2026-11-18T12:00:00+00:00",
  updated_at: "2026-11-18T12:00:00+00:00",
};
const saved = {
  id: valueId,
  user_id: userId,
  definition_id: definitionId,
  entity_id: entityId,
  value: "brown",
};

function fakeClient(rows: Record<string, unknown>, emptyValueRead = false) {
  const queries: Record<string, ReturnType<typeof chainFor>> = {};
  function chainFor(table: string) {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: rows[table], error: null }),
      single: jest.fn().mockResolvedValue({ data: rows[table], error: null }),
      maybeSingle: jest.fn().mockResolvedValue({
        data:
          table === "custom_field_values" && emptyValueRead
            ? null
            : rows[table],
        error: null,
      }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: rows[table], error: null }),
    };
  }
  const from = jest.fn((table: string) => {
    queries[table] ??= chainFor(table);
    return queries[table];
  });
  return { client: { from } as unknown as SupabaseClient, from, queries };
}

const online = async () => ({ isConnected: true, isInternetReachable: true });

it("creates a definition with only allowed fields and scopes the returned module", async () => {
  const { client, queries } = fakeClient({
    custom_field_definitions: definition,
  });
  const repo = createRepositories(client, online);
  await expect(
    repo.createCustomFieldDefinition(userId, {
      module_type: "pets",
      name: " Color ",
      field_type: "single-select",
      config: { options: ["brown", "black"] },
      user_id: otherUserId,
    } as Parameters<typeof repo.createCustomFieldDefinition>[1]),
  ).resolves.toEqual(definition);
  expect(queries.custom_field_definitions.insert).toHaveBeenCalledWith({
    module_type: "pets",
    name: "Color",
    field_type: "single-select",
    config: { options: ["brown", "black"] },
    user_id: userId,
  });
  await expect(
    repo.createCustomFieldDefinition(userId, {
      module_type: "pets",
      name: "Bad",
      field_type: "single-select",
      config: { options: [] },
    }),
  ).rejects.toThrow();
  expect(queries.custom_field_definitions.insert).toHaveBeenCalledTimes(1);
});

it("validates the owner, module, entity, and option before saving a value", async () => {
  const { client, queries } = fakeClient({
    custom_field_definitions: definition,
    pets: pet,
    custom_field_values: saved,
  });
  const repo = createRepositories(client, online);
  await expect(
    repo.saveCustomFieldValue(userId, "pets", entityId, definitionId, "brown"),
  ).resolves.toEqual(saved);
  expect(queries.custom_field_definitions.eq).toHaveBeenCalledWith(
    "module_type",
    "pets",
  );
  expect(queries.pets.eq).toHaveBeenCalledWith("user_id", userId);
  expect(queries.pets.eq).toHaveBeenCalledWith("id", entityId);
  expect(queries.custom_field_values.update).toHaveBeenCalledWith({
    value: "brown",
  });
  expect(queries.custom_field_values.eq).toHaveBeenCalledWith(
    "user_id",
    userId,
  );
  expect(queries.custom_field_values.eq).toHaveBeenCalledWith("id", valueId);
  await expect(
    repo.saveCustomFieldValue(userId, "pets", entityId, definitionId, "blue"),
  ).rejects.toThrow("Unknown select option");
  expect(queries.custom_field_values.update).toHaveBeenCalledTimes(1);
});

it("inserts a first value without broad update privileges", async () => {
  const { client, queries } = fakeClient(
    {
      custom_field_definitions: definition,
      pets: pet,
      custom_field_values: saved,
    },
    true,
  );
  const repo = createRepositories(client, online);
  await expect(
    repo.saveCustomFieldValue(userId, "pets", entityId, definitionId, "brown"),
  ).resolves.toEqual(saved);
  expect(queries.custom_field_values.insert).toHaveBeenCalledWith({
    user_id: userId,
    definition_id: definitionId,
    entity_id: entityId,
    value: "brown",
  });
  expect(queries.custom_field_values.update).not.toHaveBeenCalled();
});

it("lists only values with definitions in the requested module", async () => {
  const { client, queries } = fakeClient({
    custom_field_definitions: [definition],
    pets: pet,
    custom_field_values: [saved],
  });
  await expect(
    createRepositories(client).listCustomFieldValues(userId, "pets", entityId),
  ).resolves.toEqual([saved]);
  expect(queries.custom_field_definitions.eq).toHaveBeenCalledWith(
    "module_type",
    "pets",
  );
  expect(queries.custom_field_definitions.in).toHaveBeenCalledWith("id", [
    definitionId,
  ]);

  const wrongModule = fakeClient({
    custom_field_definitions: [{ ...definition, module_type: "vehicles" }],
    pets: pet,
    custom_field_values: [saved],
  });
  await expect(
    createRepositories(wrongModule.client).listCustomFieldValues(
      userId,
      "pets",
      entityId,
    ),
  ).rejects.toThrow("Unexpected custom field module");
});

it("rejects foreign or mismatched read results before writing", async () => {
  const wrongModule = fakeClient({
    custom_field_definitions: { ...definition, module_type: "vehicles" },
    pets: pet,
    custom_field_values: saved,
  });
  await expect(
    createRepositories(wrongModule.client, online).saveCustomFieldValue(
      userId,
      "pets",
      entityId,
      definitionId,
      "brown",
    ),
  ).rejects.toThrow("Unexpected custom field module");
  expect(wrongModule.from).not.toHaveBeenCalledWith("custom_field_values");

  const wrongOwner = fakeClient({
    custom_field_definitions: definition,
    pets: { ...pet, user_id: otherUserId },
  });
  await expect(
    createRepositories(wrongOwner.client, online).saveCustomFieldValue(
      userId,
      "pets",
      entityId,
      definitionId,
      "brown",
    ),
  ).rejects.toThrow("Unexpected record owner");
  expect(wrongOwner.from).not.toHaveBeenCalledWith("custom_field_values");
});

it("checks connectivity before writes", async () => {
  const { client, from } = fakeClient({ custom_field_definitions: definition });
  const repo = createRepositories(client, async () => ({
    isConnected: false,
    isInternetReachable: false,
  }));
  await expect(
    repo.createCustomFieldDefinition(userId, {
      module_type: "pets",
      name: "Color",
      field_type: "text",
    }),
  ).rejects.toBeInstanceOf(OfflineWriteError);
  await expect(
    repo.saveCustomFieldValue(userId, "pets", entityId, definitionId, "brown"),
  ).rejects.toBeInstanceOf(OfflineWriteError);
  expect(from).not.toHaveBeenCalled();
});
