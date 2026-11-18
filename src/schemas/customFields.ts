import { z } from "zod";

export const customFieldModule = z.enum(["tasks", "pets", "vehicles"]);
export type CustomFieldModule = z.infer<typeof customFieldModule>;

const id = z.uuid();
const name = z.string().trim().min(1);
const options = z.array(z.string()).min(1);
const config = z.record(z.string(), z.unknown());

export const customFieldDefinitionCreate = z
  .object({
    module_type: customFieldModule,
    name,
    field_type: z.enum(["text", "number", "date", "boolean", "single-select"]),
    config: config.optional(),
  })
  .superRefine((definition, context) => {
    if (
      definition.field_type === "single-select" &&
      !options.safeParse(definition.config?.options).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["config", "options"],
        message: "Select fields require a nonempty string options array",
      });
    }
  });

export const customFieldDefinitionRow = customFieldDefinitionCreate.safeExtend({
  id,
  user_id: id,
  config,
});
export const customFieldDefinitionUpdate = z.object({ name });

export const customFieldValueRow = z.object({
  id,
  user_id: id,
  definition_id: id,
  entity_id: id,
  value: z.union([z.string(), z.number().finite(), z.boolean()]),
});

export type CustomFieldDefinition = z.infer<typeof customFieldDefinitionRow>;
export type CustomFieldValue = z.infer<typeof customFieldValueRow>;
export type CustomFieldValueInput = CustomFieldValue["value"];

export function parseCustomFieldValue(
  definition: CustomFieldDefinition,
  value: unknown,
): CustomFieldValueInput {
  switch (definition.field_type) {
    case "text":
      return z.string().parse(value);
    case "number":
      return z.number().finite().parse(value);
    case "date":
      return z.iso.date().parse(value);
    case "boolean":
      return z.boolean().parse(value);
    case "single-select": {
      const selected = z.string().parse(value);
      const choices = options.parse(definition.config.options);
      if (!choices.includes(selected)) throw new Error("Unknown select option");
      return selected;
    }
  }
}
