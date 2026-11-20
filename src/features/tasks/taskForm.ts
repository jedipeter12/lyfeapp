import type { EntityCreate, EntityRow } from "@/schemas/entities";

export type TaskDraft = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  dueTime: string;
  petId: string | null;
  vehicleId: string | null;
};

export function initialTaskDraft(task?: EntityRow<"tasks">): TaskDraft {
  const due = task?.due_at ? new Date(task.due_at) : null;
  const local = due
    ? {
        dueDate: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`,
        dueTime: `${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`,
      }
    : { dueDate: "", dueTime: "09:00" };
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority:
      task?.priority === "low" || task?.priority === "high"
        ? task.priority
        : "medium",
    ...local,
    petId: task?.pet_id ?? null,
    vehicleId: task?.vehicle_id ?? null,
  };
}

export function parseLocalDueDate(date: string, time: string): string | null {
  if (!date.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match || !clock) throw new Error("Enter a valid date and time.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(clock[1]);
  const minute = Number(clock[2]);
  const due = new Date(year, month - 1, day, hour, minute);
  if (
    due.getFullYear() !== year ||
    due.getMonth() !== month - 1 ||
    due.getDate() !== day ||
    due.getHours() !== hour ||
    due.getMinutes() !== minute
  )
    throw new Error("Enter a valid date and time in your device time zone.");
  return due.toISOString();
}

export function taskInputFromDraft(draft: TaskDraft): EntityCreate<"tasks"> {
  if (!draft.title.trim()) throw new Error("Enter a task title.");
  if (draft.petId && draft.vehicleId)
    throw new Error("Link either a pet or a vehicle.");
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    status: "pending",
    priority: draft.priority,
    due_at: parseLocalDueDate(draft.dueDate, draft.dueTime),
    pet_id: draft.petId,
    vehicle_id: draft.vehicleId,
  };
}
