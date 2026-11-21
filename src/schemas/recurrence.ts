import { z } from "zod";

const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });

export const recurrenceRuleRow = z.object({
  id,
  user_id: id,
  task_id: id,
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().positive(),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable(),
  timezone: z.string().trim().min(1),
  end_at: timestamp.nullable(),
  anchor_local_date: z.iso.date(),
  anchor_local_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(?::00(?:\.0+)?)?$/)
    .transform((value) => value.slice(0, 5)),
});

export const taskOccurrenceRow = z.object({
  id,
  user_id: id,
  task_id: id,
  recurrence_rule_id: id,
  scheduled_local_date: z.iso.date(),
  scheduled_at: timestamp,
  timezone: z.string().trim().min(1),
  completed_at: timestamp,
  created_at: timestamp,
});

export const recurrenceRuleInput = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().positive(),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable(),
  timezone: z.string().trim().min(1),
  end_at: timestamp.nullable(),
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleRow>;
export type TaskOccurrence = z.infer<typeof taskOccurrenceRow>;
export type RecurrenceRuleInput = z.input<typeof recurrenceRuleInput>;
