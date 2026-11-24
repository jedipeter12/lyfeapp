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
