import {
  localDateAt,
  nextOccurrence,
  resolveLocalTime,
  type CalendarRule,
} from "../recurrence";

const base: CalendarRule = {
  frequency: "daily",
  interval: 1,
  weekdays: null,
  timezone: "America/Chicago",
  anchor_local_date: "2027-01-31",
  anchor_local_time: "09:30",
  end_at: null,
};

it("uses local calendar days rather than 24-hour UTC steps", () => {
  const rule = { ...base, anchor_local_date: "2027-03-13" };
  const first = nextOccurrence(rule);
  const second = nextOccurrence(rule, first!.localDate);
  expect(first).toEqual({
    localDate: "2027-03-13",
    at: "2027-03-13T15:30:00.000Z",
  });
  expect(second).toEqual({
    localDate: "2027-03-14",
    at: "2027-03-14T14:30:00.000Z",
  });
});

it("keeps month-end and leap-day anchors without drift", () => {
  const monthly = { ...base, frequency: "monthly" as const };
  expect(nextOccurrence(monthly, "2027-01-31")?.localDate).toBe("2027-02-28");
  expect(nextOccurrence(monthly, "2027-02-28")?.localDate).toBe("2027-03-31");
  const yearly = {
    ...base,
    frequency: "yearly" as const,
    anchor_local_date: "2028-02-29",
  };
  expect(nextOccurrence(yearly, "2028-02-29")?.localDate).toBe("2029-02-28");
  expect(nextOccurrence(yearly, "2031-02-28")?.localDate).toBe("2032-02-29");
  expect(
    nextOccurrence({ ...monthly, interval: 2 }, "2027-01-31")?.localDate,
  ).toBe("2027-03-31");
  const century = { ...yearly, anchor_local_date: "2096-02-29" };
  expect(nextOccurrence(century, "2099-02-28")?.localDate).toBe("2100-02-28");
});

it("supports interval weeks and selected weekdays", () => {
  const rule = {
    ...base,
    frequency: "weekly" as const,
    interval: 2,
    anchor_local_date: "2027-01-04",
    weekdays: [1, 3],
  };
  expect(nextOccurrence(rule)?.localDate).toBe("2027-01-04");
  expect(nextOccurrence(rule, "2027-01-04")?.localDate).toBe("2027-01-06");
  expect(nextOccurrence(rule, "2027-01-06")?.localDate).toBe("2027-01-18");
  expect(nextOccurrence({ ...rule, weekdays: [3] })?.localDate).toBe(
    "2027-01-06",
  );
});

it("moves gap times to the first valid local minute and picks the earlier overlap", () => {
  expect(resolveLocalTime("2027-03-14", "02:30", "America/Chicago")).toBe(
    "2027-03-14T08:00:00.000Z",
  );
  expect(resolveLocalTime("2027-11-07", "01:30", "America/Chicago")).toBe(
    "2027-11-07T06:30:00.000Z",
  );
  expect(resolveLocalTime("2027-03-14", "02:30", "America/New_York")).toBe(
    "2027-03-14T07:00:00.000Z",
  );
  expect(resolveLocalTime("2027-03-28", "02:30", "Europe/Berlin")).toBe(
    "2027-03-28T01:00:00.000Z",
  );
  expect(resolveLocalTime("2027-10-31", "02:30", "Europe/Berlin")).toBe(
    "2027-10-31T00:30:00.000Z",
  );
  expect(localDateAt("2027-11-07T06:30:00.000Z", "America/Chicago")).toBe(
    "2027-11-07",
  );
});

it("applies inclusive UTC end limits and validates inputs", () => {
  const first = nextOccurrence(base)!;
  expect(nextOccurrence({ ...base, end_at: first.at })?.at).toBe(first.at);
  expect(
    nextOccurrence({ ...base, end_at: first.at }, first.localDate),
  ).toBeNull();
  expect(() => nextOccurrence({ ...base, interval: 0 })).toThrow("interval");
  expect(() => nextOccurrence({ ...base, weekdays: [7] })).toThrow("weekday");
  expect(() => resolveLocalTime("2027-02-29", "09:30", "UTC")).toThrow("date");
});
