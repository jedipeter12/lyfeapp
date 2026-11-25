import { z } from "zod";

export const reminderRow = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  task_id: z.uuid(),
  remind_at: z.iso.datetime({ offset: true }),
  status: z.enum(["pending", "cancelled"]),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export type Reminder = z.infer<typeof reminderRow>;
