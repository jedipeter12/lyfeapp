export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export type CalendarRule = {
  frequency: Frequency;
  interval: number;
  weekdays: number[] | null;
  timezone: string;
  anchor_local_date: string;
  anchor_local_time: string;
  end_at: string | null;
};

export type Occurrence = { localDate: string; at: string };

const dayMs = 86_400_000;

function parts(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Invalid recurrence date");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = Date.UTC(year, month - 1, day);
  const check = new Date(value);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  )
    throw new Error("Invalid recurrence date");
  return { year, month, day, value };
}

function dateFromMs(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function monthDate(year: number, month: number, anchorDay: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return dateFromMs(
    Date.UTC(
      first.getUTCFullYear(),
      first.getUTCMonth(),
      Math.min(anchorDay, days),
    ),
  );
}

function nextDate(rule: CalendarRule, after: string | null): string {
  const anchor = parts(rule.anchor_local_date);
  const cutoff = after ? parts(after) : null;
  if ((!cutoff || cutoff.value < anchor.value) && rule.frequency !== "weekly")
    return rule.anchor_local_date;
  if (rule.frequency === "weekly") {
    const effectiveCutoff =
      cutoff && cutoff.value >= anchor.value
        ? cutoff.value
        : anchor.value - dayMs;
    const anchorWeek =
      anchor.value - new Date(anchor.value).getUTCDay() * dayMs;
    const weekdays = rule.weekdays?.length
      ? [...new Set(rule.weekdays)].sort((a, b) => a - b)
      : [new Date(anchor.value).getUTCDay()];
    const elapsedWeeks = Math.floor(
      (effectiveCutoff - anchorWeek) / (7 * dayMs),
    );
    let week = Math.max(
      0,
      Math.floor(elapsedWeeks / rule.interval) * rule.interval,
    );
    for (let scan = 0; scan < 2; scan++, week += rule.interval) {
      for (const weekday of weekdays) {
        const candidate = anchorWeek + week * 7 * dayMs + weekday * dayMs;
        if (candidate >= anchor.value && candidate > effectiveCutoff)
          return dateFromMs(candidate);
      }
    }
    throw new Error("No weekly occurrence found");
  }
  if (!cutoff) return rule.anchor_local_date;

  if (rule.frequency === "daily") {
    const days = Math.floor((cutoff.value - anchor.value) / dayMs);
    return dateFromMs(
      anchor.value +
        (Math.floor(days / rule.interval) + 1) * rule.interval * dayMs,
    );
  }

  if (rule.frequency === "monthly") {
    const elapsed =
      (cutoff.year - anchor.year) * 12 + cutoff.month - anchor.month;
    let index = Math.max(0, Math.floor(elapsed / rule.interval));
    for (let scan = 0; scan < 2; scan++, index++) {
      const candidate = monthDate(
        anchor.year,
        anchor.month + index * rule.interval,
        anchor.day,
      );
      if (parts(candidate).value > cutoff.value) return candidate;
    }
  } else {
    const elapsed = cutoff.year - anchor.year;
    let index = Math.max(0, Math.floor(elapsed / rule.interval));
    for (let scan = 0; scan < 2; scan++, index++) {
      const candidate = monthDate(
        anchor.year + index * rule.interval,
        anchor.month,
        anchor.day,
      );
      if (parts(candidate).value > cutoff.value) return candidate;
    }
  }
  throw new Error("No recurrence occurrence found");
}

function localParts(formatter: Intl.DateTimeFormat, instant: number) {
  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date(instant))
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function localDateAt(instant: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return localParts(formatter, Date.parse(instant)).slice(0, 10);
}

export function localTimeAt(instant: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return localParts(formatter, Date.parse(instant)).slice(11);
}

export function resolveLocalTime(date: string, time: string, timezone: string) {
  const { year, month, day } = parts(date);
  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!clock) throw new Error("Invalid recurrence time");
  const target = `${date}T${time}`;
  const nominal = Date.UTC(
    year,
    month - 1,
    day,
    Number(clock[1]),
    Number(clock[2]),
  );
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  // Try offsets sampled on either side of a transition. Two matches in a fall
  // overlap resolve to the earlier UTC instant.
  const offsets = new Set<number>();
  for (const hours of [-24, -12, 0, 12, 24]) {
    const sample = nominal + hours * 3_600_000;
    const local = localParts(formatter, sample);
    offsets.add(Date.parse(`${local}:00Z`) - sample);
  }
  const matches = [...offsets]
    .map((offset) => nominal - offset)
    .filter((candidate) => localParts(formatter, candidate) === target);
  if (matches.length) return new Date(Math.min(...matches)).toISOString();

  // A spring gap has no exact match. Pick the first valid local minute after
  // the requested wall time on the same date.
  let first: { local: string; instant: number } | null = null;
  for (
    let instant = nominal - 15 * 3_600_000;
    instant <= nominal + 15 * 3_600_000;
    instant += 60_000
  ) {
    const local = localParts(formatter, instant);
    if (
      local.slice(0, 10) === date &&
      local >= target &&
      (!first ||
        local < first.local ||
        (local === first.local && instant < first.instant))
    ) {
      first = { local, instant };
    }
  }
  if (!first) throw new Error("No valid local time on this date");
  return new Date(first.instant).toISOString();
}

export function nextOccurrence(
  rule: CalendarRule,
  afterLocalDate: string | null = null,
): Occurrence | null {
  if (!Number.isSafeInteger(rule.interval) || rule.interval < 1)
    throw new Error("Invalid recurrence interval");
  if (
    rule.weekdays?.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  )
    throw new Error("Invalid weekday");
  const localDate = nextDate(rule, afterLocalDate);
  const at = resolveLocalTime(localDate, rule.anchor_local_time, rule.timezone);
  if (rule.end_at && Date.parse(at) > Date.parse(rule.end_at)) return null;
  return { localDate, at };
}
