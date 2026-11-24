import { initialPetCareDraft, petCareInputFromDraft } from "../petCareForm";

const blank = { name: "", firstDate: "", secondDate: "", detail: "" };

it("validates a dated health event and rejects a future event", () => {
  expect(
    petCareInputFromDraft("health", {
      ...blank,
      name: " Checkup ",
      firstDate: "2026-01-15",
      detail: "Routine visit",
    }),
  ).toEqual({
    event_type: "Checkup",
    occurred_at: expect.any(String),
    notes: "Routine visit",
  });
  expect(() =>
    petCareInputFromDraft("health", {
      ...blank,
      name: "Checkup",
      firstDate: "2099-01-01",
    }),
  ).toThrow("future");
});

it("checks medication date order and vaccination date validity", () => {
  expect(() =>
    petCareInputFromDraft("medications", {
      ...blank,
      name: "Medicine",
      firstDate: "2026-12-10",
      secondDate: "2026-12-09",
    }),
  ).toThrow("End date");
  expect(() =>
    petCareInputFromDraft("vaccinations", {
      ...blank,
      name: "Vaccine",
      secondDate: "2026-02-30",
    }),
  ).toThrow("valid second date");
  expect(
    petCareInputFromDraft("vaccinations", {
      ...blank,
      name: "Vaccine",
      secondDate: "2027-01-01",
    }),
  ).toEqual({ name: "Vaccine", administered_on: null, due_on: "2027-01-01" });
});

it("loads an existing medication for correction", () => {
  expect(
    initialPetCareDraft("medications", {
      id: "55555555-5555-4555-8555-555555555555",
      user_id: "11111111-1111-4111-8111-111111111111",
      pet_id: "33333333-3333-4333-8333-333333333333",
      name: "Medicine",
      dosage_text: "1 tablet",
      start_date: "2026-11-01",
      end_date: "2026-11-30",
    }),
  ).toEqual({
    name: "Medicine",
    firstDate: "2026-11-01",
    secondDate: "2026-11-30",
    detail: "1 tablet",
  });
});
