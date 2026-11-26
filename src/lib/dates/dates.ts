import type { ISODate, Timestamp } from "@/lib/domain/types";

/**
 * Calendar-day helpers. A "day" is always a calendar date in the user's IANA timezone,
 * computed with Intl so DST and travel are handled by the platform's tz database.
 * Date arithmetic on ISODate strings is done in UTC, where every day has 24 hours.
 */

const dayFormatters = new Map<string, Intl.DateTimeFormat>();
function dayFormatter(tz: string) {
  let f = dayFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayFormatters.set(tz, f);
  }
  return f;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date of an instant in a timezone. */
export function localDate(at: Timestamp | Date | number, tz: string): ISODate {
  const parts = dayFormatter(tz).formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Local hour 0–23 of an instant in a timezone. */
export function localHour(at: Timestamp | Date | number, tz: string): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(at));
  return Number(h) % 24;
}

/** Local "HH:MM" of an instant in a timezone. */
export function localTime(at: Timestamp | Date | number, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(at));
}

function parse(d: ISODate): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new RangeError(`Not an ISO date: ${d}`);
  return Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
}
function format(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  return format(parse(d) + n * 86_400_000);
}

/** Whole days from a to b (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(d: ISODate): number {
  const w = new Date(parse(d)).getUTCDay();
  return w === 0 ? 7 : w;
}

/** Inclusive list of dates from → to. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const n = diffDays(from, to);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

export function monthKey(d: ISODate): string {
  return d.slice(0, 7);
}

/** Monday of the ISO week containing d. */
export function startOfWeek(d: ISODate): ISODate {
  return addDays(d, 1 - isoWeekday(d));
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The user's device timezone, falling back to UTC. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** UTC instant for a wall-clock date + "HH:MM" in a time zone (DST-safe, two-pass). */
export function zonedToUtc(date: ISODate, time: string, tz: string): Date {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (at: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .formatToParts(at)
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!) - at;
  };
  let t = wall - offset(wall);
  t = wall - offset(t);
  return new Date(t);
}
