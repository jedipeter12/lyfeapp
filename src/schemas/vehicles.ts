import { z } from "zod";

export const mileageEntryRow = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  vehicle_id: z.uuid(),
  odometer: z.number().int().min(0),
  recorded_at: z.iso.datetime({ offset: true }),
});

export const mileageEntryCreate = mileageEntryRow.pick({
  odometer: true,
  recorded_at: true,
});

export type MileageEntry = z.infer<typeof mileageEntryRow>;

const cost = z.union([z.number(), z.string()]).transform((value, context) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    context.addIssue({ code: "custom", message: "Invalid cost" });
    return z.NEVER;
  }
  return number;
});

export const serviceRecordRow = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  vehicle_id: z.uuid(),
  service_type: z.string().trim().min(1),
  performed_on: z.iso.date(),
  odometer: z.number().int().min(0).nullable(),
  cost: cost.nullable(),
  currency_code: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
});

export const serviceRecordCreate = z.object({
  service_type: z.string().trim().min(1),
  performed_on: z.iso.date(),
  odometer: z.number().int().min(0).nullable(),
  cost: z.number().finite().nonnegative().nullable(),
  currency_code: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
});

export type ServiceRecord = z.infer<typeof serviceRecordRow>;
