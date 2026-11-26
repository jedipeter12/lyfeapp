import type { EntityRow } from "@/schemas/entities";

export type VehicleDraft = {
  year: string;
  make: string;
  model: string;
  vin: string;
  currentMileage: string;
};

export function initialVehicleDraft(
  vehicle?: EntityRow<"vehicles">,
): VehicleDraft {
  return {
    year: vehicle ? String(vehicle.year) : "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    vin: vehicle?.vin ?? "",
    currentMileage:
      vehicle?.current_mileage == null ? "" : String(vehicle.current_mileage),
  };
}

function nonnegativeInteger(value: string, label: string) {
  if (!/^\d+$/.test(value.trim()))
    throw new Error(`Enter a whole-number ${label}.`);
  const number = Number(value.trim());
  if (!Number.isSafeInteger(number)) throw new Error(`Enter a valid ${label}.`);
  return number;
}

export function vehicleInputFromDraft(draft: VehicleDraft) {
  const make = draft.make.trim();
  const model = draft.model.trim();
  if (!make || !model) throw new Error("Enter a make and model.");
  const vin = draft.vin.replace(/\s/g, "").toUpperCase();
  return {
    year: nonnegativeInteger(draft.year, "year"),
    make,
    model,
    vin: vin || null,
    current_mileage: draft.currentMileage.trim()
      ? nonnegativeInteger(draft.currentMileage, "mileage")
      : null,
  };
}

export function mileageInputFromDraft(value: string, now = new Date()) {
  return {
    odometer: nonnegativeInteger(value, "mileage"),
    recorded_at: now.toISOString(),
  };
}
