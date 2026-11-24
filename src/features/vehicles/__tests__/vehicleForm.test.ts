import {
  initialVehicleDraft,
  mileageInputFromDraft,
  vehicleInputFromDraft,
} from "../vehicleForm";

const blank = initialVehicleDraft();

it("normalizes an optional VIN and validates whole-number vehicle values", () => {
  expect(
    vehicleInputFromDraft({
      ...blank,
      year: "2022",
      make: "  Example ",
      model: " Coupe  ",
      vin: " ab 12\tcd ",
      currentMileage: "12500",
    }),
  ).toEqual({
    year: 2022,
    make: "Example",
    model: "Coupe",
    vin: "AB12CD",
    current_mileage: 12500,
  });
  expect(
    vehicleInputFromDraft({ ...blank, year: "0", make: "A", model: "B" }).vin,
  ).toBeNull();
  expect(() =>
    vehicleInputFromDraft({ ...blank, year: "2020.5", make: "A", model: "B" }),
  ).toThrow();
  expect(() =>
    vehicleInputFromDraft({
      ...blank,
      year: "2020",
      make: "A",
      model: "B",
      currentMileage: "-1",
    }),
  ).toThrow();
});

it("records a timestamped nonnegative odometer value", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  expect(mileageInputFromDraft("1234", now)).toEqual({
    odometer: 1234,
    recorded_at: "2026-11-24T12:00:00.000Z",
  });
  expect(() => mileageInputFromDraft("1.5", now)).toThrow();
  expect(() => mileageInputFromDraft("", now)).toThrow();
});
