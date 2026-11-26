import type { ISODate } from "@/lib/domain/types";
import { localDate, localTime } from "@/lib/dates/dates";

/**
 * When to send the daily habit reminder. Built for an imprecise scheduler (cron may run
 * late): a reminder is due once the user's local reminder time has passed today, it
 * hasn't been sent today, and it isn't quiet hours.
 */

/** "HH:MM" comparisons work lexicographically. */
export function inQuietHours(time: string, start: string, end: string): boolean {
  if (start === end) return false;
  return start < end ? time >= start && time < end : time >= start || time < end;
}

export type ReminderPrefs = {
  timezone: string;
  reminderTimes: string[];
  quietStart: string;
  quietEnd: string;
  lastRemindedOn: ISODate | null;
};

export function isReminderDue(
  p: ReminderPrefs,
  now: Date | number,
): { due: boolean; today: ISODate } {
  const today = localDate(now, p.timezone);
  const time = localTime(now, p.timezone);
  const first = [...p.reminderTimes].sort()[0];
  const due =
    Boolean(first) &&
    time >= first! &&
    p.lastRemindedOn !== today &&
    !inQuietHours(time, p.quietStart, p.quietEnd);
  return { due, today };
}

export function reminderBody(left: number, template: { one: string; many: string }): string {
  return (left === 1 ? template.one : template.many).replace("{n}", String(left));
}
