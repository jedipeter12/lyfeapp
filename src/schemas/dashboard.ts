import { z } from "zod";

export const moduleType = z.enum(["tasks", "pets", "vehicles"]);
export type ModuleType = z.infer<typeof moduleType>;

export const modulePreferenceRow = z.object({
  user_id: z.uuid(),
  module_type: moduleType,
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
});

export const reminderRow = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  task_id: z.uuid(),
  remind_at: z.iso.datetime({ offset: true }),
  status: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export type ModulePreference = z.infer<typeof modulePreferenceRow>;
export type Reminder = z.infer<typeof reminderRow>;
