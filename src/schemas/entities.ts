import { z } from "zod";

const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const date = z.iso.date();
const nonempty = z.string().trim().min(1);

export const profileRow = z.object({
  user_id: id,
  display_name: z.string(),
  timezone: nonempty,
  created_at: timestamp,
  updated_at: timestamp,
});
export const profileUpdate = z
  .object({
    display_name: z.string().trim().max(120),
    timezone: nonempty.max(100),
  })
  .partial();

export const taskRow = z.object({
  id,
  user_id: id,
  title: nonempty,
  description: z.string().nullable(),
  status: nonempty,
  priority: nonempty,
  due_at: timestamp.nullable(),
  completed_at: timestamp.nullable(),
  deleted_at: timestamp.nullable(),
  pet_id: id.nullable(),
  vehicle_id: id.nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});
export const taskCreate = z
  .object({
    title: nonempty,
    description: z.string().nullable().optional(),
    status: nonempty,
    priority: nonempty,
    due_at: timestamp.nullable().optional(),
    completed_at: timestamp.nullable().optional(),
    pet_id: id.nullable().optional(),
    vehicle_id: id.nullable().optional(),
  })
  .refine((value) => !(value.pet_id && value.vehicle_id), {
    message: "A task can link to only one entity",
  });
export const taskUpdate = z.object({
  title: nonempty.optional(),
  description: z.string().nullable().optional(),
  status: nonempty.optional(),
  priority: nonempty.optional(),
  due_at: timestamp.nullable().optional(),
  completed_at: timestamp.nullable().optional(),
  pet_id: id.nullable().optional(),
  vehicle_id: id.nullable().optional(),
});

export const petRow = z.object({
  id,
  user_id: id,
  name: nonempty,
  species: nonempty,
  breed: z.string().nullable(),
  birth_date: date.nullable(),
  notes: z.string().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});
export const petCreate = z.object({
  name: nonempty,
  species: nonempty,
  breed: z.string().nullable().optional(),
  birth_date: date.nullable().optional(),
  notes: z.string().nullable().optional(),
});
export const petUpdate = petCreate.partial();

export const vehicleRow = z.object({
  id,
  user_id: id,
  year: z.number().int().min(0),
  make: nonempty,
  model: nonempty,
  vin: z.string().nullable(),
  current_mileage: z.number().int().min(0).nullable(),
});
export const vehicleCreate = z.object({
  year: z.number().int().min(0),
  make: nonempty,
  model: nonempty,
  vin: z.string().nullable().optional(),
  current_mileage: z.number().int().min(0).nullable().optional(),
});
export const vehicleUpdate = vehicleCreate.partial();

export const entitySchemas = {
  tasks: { row: taskRow, create: taskCreate, update: taskUpdate },
  pets: { row: petRow, create: petCreate, update: petUpdate },
  vehicles: { row: vehicleRow, create: vehicleCreate, update: vehicleUpdate },
} as const;

export type EntityTable = keyof typeof entitySchemas;
export type EntityRow<T extends EntityTable> = z.infer<
  (typeof entitySchemas)[T]["row"]
>;
export type EntityCreate<T extends EntityTable> = z.input<
  (typeof entitySchemas)[T]["create"]
>;
export type EntityUpdate<T extends EntityTable> = z.input<
  (typeof entitySchemas)[T]["update"]
>;
export type Profile = z.infer<typeof profileRow>;
