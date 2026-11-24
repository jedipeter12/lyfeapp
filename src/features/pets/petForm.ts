import { z } from "zod";
import type { EntityRow } from "@/schemas/entities";

export type PetDraft = {
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  notes: string;
};

export function todayLocalDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validPastOrToday(value: string, label: string): string | null {
  if (!value) return null;
  if (!z.iso.date().safeParse(value).success || value > todayLocalDate()) {
    throw new Error(`Enter a valid ${label} on or before today (YYYY-MM-DD).`);
  }
  return value;
}

export function initialPetDraft(pet?: EntityRow<"pets">): PetDraft {
  return {
    name: pet?.name ?? "",
    species: pet?.species ?? "",
    breed: pet?.breed ?? "",
    birthDate: pet?.birth_date ?? "",
    notes: pet?.notes ?? "",
  };
}

export function petInputFromDraft(draft: PetDraft) {
  const name = draft.name.trim();
  const species = draft.species.trim();
  if (!name || !species) throw new Error("Name and species are required.");
  return {
    name,
    species,
    breed: draft.breed.trim() || null,
    birth_date: validPastOrToday(draft.birthDate.trim(), "birth date"),
    notes: draft.notes.trim() || null,
  };
}

export type WeightDraft = { weight: string; measuredDate: string };

export function initialWeightDraft(entry?: {
  weight_kg: number;
  measured_at: string;
}): WeightDraft {
  return {
    weight: entry ? String(entry.weight_kg) : "",
    measuredDate: entry
      ? todayLocalDate(new Date(entry.measured_at))
      : todayLocalDate(),
  };
}

export function weightInputFromDraft(
  draft: WeightDraft,
  originalMeasuredAt?: string,
) {
  const text = draft.weight.trim();
  if (!/^(?:\d+)(?:\.\d+)?$/.test(text))
    throw new Error("Enter a positive weight in kilograms.");
  const weight_kg = Number(text);
  if (!Number.isFinite(weight_kg) || weight_kg <= 0)
    throw new Error("Enter a positive weight in kilograms.");
  const date = validPastOrToday(draft.measuredDate.trim(), "measurement date");
  if (!date) throw new Error("Measurement date is required.");
  if (
    originalMeasuredAt &&
    date === todayLocalDate(new Date(originalMeasuredAt))
  ) {
    return { weight_kg, measured_at: originalMeasuredAt };
  }
  const [year, month, day] = date.split("-").map(Number);
  const measured = new Date(0);
  measured.setFullYear(year, month - 1, day);
  measured.setHours(12, 0, 0, 0);
  return { weight_kg, measured_at: measured.toISOString() };
}
