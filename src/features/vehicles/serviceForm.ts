import { serviceRecordCreate } from "@/schemas/vehicles";
import type { ServiceRecord } from "@/schemas/vehicles";

export type ServiceDraft = {
  serviceType: string;
  performedOn: string;
  odometer: string;
  cost: string;
  currencyCode: string;
};

export function initialServiceDraft(): ServiceDraft {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  return {
    serviceType: "",
    performedOn: localDate,
    odometer: "",
    cost: "",
    currencyCode: "",
  };
}

export function serviceDraftFromRecord(record: ServiceRecord): ServiceDraft {
  return {
    serviceType: record.service_type,
    performedOn: record.performed_on,
    odometer: record.odometer == null ? "" : String(record.odometer),
    cost: record.cost == null ? "" : String(record.cost),
    currencyCode: record.currency_code ?? "",
  };
}

export function serviceInputFromDraft(draft: ServiceDraft) {
  const odometer = draft.odometer.trim();
  const costText = draft.cost.trim();
  const currencyCode = draft.currencyCode.trim().toUpperCase();
  if (odometer && !/^\d+$/.test(odometer))
    throw new Error("Enter a whole-number odometer reading.");
  if (odometer && !Number.isSafeInteger(Number(odometer)))
    throw new Error("Enter a valid odometer reading.");
  if (costText && !/^\d+(\.\d+)?$/.test(costText))
    throw new Error("Enter a nonnegative numeric cost.");
  if (costText && !currencyCode)
    throw new Error("Enter a three-letter currency code for the cost.");
  const parsed = serviceRecordCreate.safeParse({
    service_type: draft.serviceType.trim(),
    performed_on: draft.performedOn.trim(),
    odometer: odometer ? Number(odometer) : null,
    cost: costText ? Number(costText) : null,
    currency_code: currencyCode || null,
  });
  if (!parsed.success)
    throw new Error("Check service, date, cost and currency.");
  return parsed.data;
}
