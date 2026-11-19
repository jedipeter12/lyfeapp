import {
  customFieldDefinitionCreate,
  customFieldDefinitionRow,
  parseCustomFieldValue,
} from "../customFields";

const definition = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  user_id: "11111111-1111-4111-8111-111111111111",
  module_type: "pets" as const,
  name: "Example",
  field_type: "text" as const,
  config: {},
};

it("validates all five field types against their definitions", () => {
  const examples = [
    { field_type: "text", value: "blue", invalid: 2, config: {} },
    { field_type: "number", value: 2.5, invalid: "2.5", config: {} },
    {
      field_type: "date",
      value: "2024-02-29",
      invalid: "2025-02-29",
      config: {},
    },
    { field_type: "boolean", value: false, invalid: "false", config: {} },
    {
      field_type: "single-select",
      value: "blue",
      invalid: "green",
      config: { options: ["blue", "red"] },
    },
  ] as const;
  for (const example of examples) {
    const parsed = customFieldDefinitionRow.parse({
      ...definition,
      field_type: example.field_type,
      config: example.config,
    });
    expect(parseCustomFieldValue(parsed, example.value)).toBe(example.value);
    expect(() => parseCustomFieldValue(parsed, example.invalid)).toThrow();
  }
});

it("rejects invalid definition modules and select options", () => {
  expect(() =>
    customFieldDefinitionCreate.parse({
      module_type: "finances",
      name: "Amount",
      field_type: "number",
    }),
  ).toThrow();
  expect(() =>
    customFieldDefinitionCreate.parse({
      module_type: "pets",
      name: "Color",
      field_type: "single-select",
      config: { options: [] },
    }),
  ).toThrow();
  expect(() =>
    customFieldDefinitionCreate.parse({
      module_type: "pets",
      name: "Color",
      field_type: "single-select",
      config: { options: ["blue", 1] },
    }),
  ).toThrow();
});
