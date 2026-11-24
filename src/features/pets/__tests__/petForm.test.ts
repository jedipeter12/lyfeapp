import {
  initialPetDraft,
  petInputFromDraft,
  todayLocalDate,
  weightInputFromDraft,
} from "../petForm";

describe("pet form", () => {
  it("trims profile fields and validates calendar dates", () => {
    expect(
      petInputFromDraft({
        ...initialPetDraft(),
        name: "  Milo  ",
        species: " cat ",
        birthDate: "2024-02-29",
      }),
    ).toMatchObject({
      name: "Milo",
      species: "cat",
      birth_date: "2024-02-29",
      breed: null,
    });
    expect(() =>
      petInputFromDraft({
        ...initialPetDraft(),
        name: "Milo",
        species: "cat",
        birthDate: "2025-02-29",
      }),
    ).toThrow("valid birth date");
    expect(() =>
      petInputFromDraft({ ...initialPetDraft(), name: " ", species: "cat" }),
    ).toThrow("required");
  });

  it("requires positive finite kilograms and a valid measurement date", () => {
    expect(
      weightInputFromDraft({ weight: " 4.25 ", measuredDate: "2024-02-29" }),
    ).toMatchObject({ weight_kg: 4.25, measured_at: expect.any(String) });
    for (const weight of ["0", "-1", "Infinity", "NaN", "1e400"]) {
      expect(() =>
        weightInputFromDraft({ weight, measuredDate: "2024-02-29" }),
      ).toThrow("positive weight");
    }
    expect(() =>
      weightInputFromDraft({ weight: "4", measuredDate: "2024-02-30" }),
    ).toThrow("valid measurement date");
    const original = "2024-02-29T18:45:00.000Z";
    expect(
      weightInputFromDraft(
        { weight: "4.5", measuredDate: todayLocalDate(new Date(original)) },
        original,
      ).measured_at,
    ).toBe(original);
    const now = new Date("2026-11-24T09:15:00.000Z");
    expect(
      weightInputFromDraft(
        { weight: "4.5", measuredDate: todayLocalDate(now) },
        undefined,
        now,
      ).measured_at,
    ).toBe(now.toISOString());
  });
});
