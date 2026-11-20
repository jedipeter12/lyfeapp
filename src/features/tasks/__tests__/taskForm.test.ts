import {
  initialTaskDraft,
  parseLocalDueDate,
  taskInputFromDraft,
} from "../taskForm";

it("accepts a real local due time and rejects rollover or missing time", () => {
  expect(parseLocalDueDate("2027-05-01", "09:30")).toBe(
    new Date(2027, 4, 1, 9, 30).toISOString(),
  );
  expect(parseLocalDueDate("", "09:00")).toBeNull();
  expect(() => parseLocalDueDate("2027-02-29", "09:00")).toThrow();
  expect(() => parseLocalDueDate("2027-05-01", "25:00")).toThrow();
});

it("builds a pending task with one optional owner-linked entity", () => {
  const draft = initialTaskDraft();
  expect(
    taskInputFromDraft({
      ...draft,
      title: "  Renew registration  ",
      vehicleId: "44444444-4444-4444-8444-444444444444",
    }),
  ).toEqual({
    title: "Renew registration",
    description: null,
    status: "pending",
    priority: "medium",
    due_at: null,
    pet_id: null,
    vehicle_id: "44444444-4444-4444-8444-444444444444",
  });
  expect(() => taskInputFromDraft({ ...draft, title: " " })).toThrow("title");
  expect(() =>
    taskInputFromDraft({
      ...draft,
      title: "Task",
      petId: "pet",
      vehicleId: "vehicle",
    }),
  ).toThrow("either");
});
