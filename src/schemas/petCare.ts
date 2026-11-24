import { z } from "zod";

const id = z.uuid();
const date = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });
const name = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(2000).nullable();

export const petHealthEventRow = z.object({
  id,
  user_id: id,
  pet_id: id,
  event_type: name,
  occurred_at: timestamp,
  notes: optionalText,
});
export const petHealthEventInput = petHealthEventRow.pick({
  event_type: true,
  occurred_at: true,
  notes: true,
});

export const petMedicationRow = z.object({
  id,
  user_id: id,
  pet_id: id,
  name,
  dosage_text: optionalText,
  start_date: date.nullable(),
  end_date: date.nullable(),
});
export const petMedicationInput = petMedicationRow
  .pick({ name: true, dosage_text: true, start_date: true, end_date: true })
  .refine(
    ({ start_date, end_date }) =>
      !start_date || !end_date || end_date >= start_date,
    { message: "End date must be on or after start date." },
  );

export const petVaccinationRow = z.object({
  id,
  user_id: id,
  pet_id: id,
  name,
  administered_on: date.nullable(),
  due_on: date.nullable(),
});
export const petVaccinationInput = petVaccinationRow.pick({
  name: true,
  administered_on: true,
  due_on: true,
});

export const petCareSchemas = {
  health: {
    table: "pet_health_events",
    row: petHealthEventRow,
    input: petHealthEventInput,
    order: "occurred_at",
  },
  medications: {
    table: "pet_medications",
    row: petMedicationRow,
    input: petMedicationInput,
    order: "start_date",
  },
  vaccinations: {
    table: "pet_vaccinations",
    row: petVaccinationRow,
    input: petVaccinationInput,
    order: "administered_on",
  },
} as const;

export type PetCareKind = keyof typeof petCareSchemas;
export type PetCareRow<K extends PetCareKind> = z.infer<
  (typeof petCareSchemas)[K]["row"]
>;
export type PetCareInput<K extends PetCareKind> = z.input<
  (typeof petCareSchemas)[K]["input"]
>;
