import { initialServiceDraft, serviceInputFromDraft } from "../serviceForm";

it("validates date, numeric cost and currency", () => {
  const draft = {
    ...initialServiceDraft(),
    serviceType: " Tires ",
    performedOn: "2026-11-24",
    cost: "120.5",
    currencyCode: "usd",
  };
  expect(serviceInputFromDraft(draft)).toEqual({
    service_type: "Tires",
    performed_on: "2026-11-24",
    odometer: null,
    cost: 120.5,
    currency_code: "USD",
  });
  expect(() =>
    serviceInputFromDraft({ ...draft, performedOn: "2026-02-30" }),
  ).toThrow();
  expect(() => serviceInputFromDraft({ ...draft, cost: "Infinity" })).toThrow();
  expect(() => serviceInputFromDraft({ ...draft, currencyCode: "" })).toThrow();
});
