import { z } from "zod";
import { parseLocalDueDate } from "@/features/tasks/taskForm";
import { todayLocalDate } from "./petForm";
import {
  petCareSchemas,
  type PetCareInput,
  type PetCareKind,
  type PetCareRow,
} from "@/schemas/petCare";

export type PetCareDraft = {
  name: string;
  firstDate: string;
  secondDate: string;
  detail: string;
};

function localDate(timestamp: string): string {
  return todayLocalDate(new Date(timestamp));
}

export function initialPetCareDraft<K extends PetCareKind>(
  kind: K,
  row?: PetCareRow<K>,
): PetCareDraft {
  if (!row) return { name: "", firstDate: "", secondDate: "", detail: "" };
  switch (kind) {
    case "health": {
      const event = row as PetCareRow<"health">;
      return {
        name: event.event_type,
        firstDate: localDate(event.occurred_at),
        secondDate: "",
        detail: event.notes ?? "",
      };
    }
    case "medications": {
      const medication = row as PetCareRow<"medications">;
      return {
        name: medication.name,
        firstDate: medication.start_date ?? "",
        secondDate: medication.end_date ?? "",
        detail: medication.dosage_text ?? "",
      };
    }
    case "vaccinations": {
      const vaccination = row as PetCareRow<"vaccinations">;
      return {
        name: vaccination.name,
        firstDate: vaccination.administered_on ?? "",
        secondDate: vaccination.due_on ?? "",
        detail: "",
      };
    }
  }
}

function optionalDate(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!z.iso.date().safeParse(trimmed).success)
    throw new Error(`Enter a valid ${label} (YYYY-MM-DD).`);
  return trimmed;
}

export function petCareInputFromDraft<K extends PetCareKind>(
  kind: K,
  draft: PetCareDraft,
): PetCareInput<K> {
  const name = draft.name.trim();
  if (!name) throw new Error("Enter a name or event type.");
  const first = optionalDate(draft.firstDate, "first date");
  const second = optionalDate(draft.secondDate, "second date");
  let input: unknown;
  switch (kind) {
    case "health":
      if (!first) throw new Error("Event date is required.");
      if (first > todayLocalDate())
        throw new Error("Event date cannot be in the future.");
      input = {
        event_type: name,
        occurred_at: parseLocalDueDate(first, "12:00"),
        notes: draft.detail.trim() || null,
      };
      break;
    case "medications":
      input = {
        name,
        dosage_text: draft.detail.trim() || null,
        start_date: first,
        end_date: second,
      };
      break;
    case "vaccinations":
      if (!first && !second)
        throw new Error("Enter an administered or next due date.");
      if (first && first > todayLocalDate())
        throw new Error("Administered date cannot be in the future.");
      input = { name, administered_on: first, due_on: second };
      break;
  }
  return petCareSchemas[kind].input.parse(input) as PetCareInput<K>;
}
