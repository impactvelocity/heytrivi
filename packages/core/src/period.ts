/**
 * Reset periods, in the household time zone.
 *
 * A weekly period starts Monday at midnight. A monthly period starts on the
 * first of the month. The period is identified by its start date (YYYY-MM-DD).
 */

import type { ResetSchedule } from "./types.js";

function localDate(now: Date, timeZone: string): { y: number; m: number; d: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), weekday };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Start date of the period containing `now`, or null for "never". */
export function periodStartFor(now: Date, schedule: ResetSchedule, timeZone: string): string | null {
  if (schedule === "never") return null;
  const { y, m, d, weekday } = localDate(now, timeZone);
  if (schedule === "monthly") return `${y}-${pad(m)}-01`;
  // Weekly: back up to Monday. Date arithmetic in UTC on the local calendar date.
  const daysSinceMonday = (weekday + 6) % 7;
  const monday = new Date(Date.UTC(y, m - 1, d - daysSinceMonday));
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

/** True when the stored period has ended and balances should reset. */
export function periodHasEnded(
  storedPeriodStart: string | undefined,
  now: Date,
  schedule: ResetSchedule,
  timeZone: string,
): boolean {
  const current = periodStartFor(now, schedule, timeZone);
  if (current === null || !storedPeriodStart) return false;
  return current > storedPeriodStart;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Start date of the period after `periodStart`: when the next reset happens. */
export function nextPeriodStart(periodStart: string, schedule: ResetSchedule): string | null {
  if (schedule === "never") return null;
  const [y, m, d] = periodStart.split("-").map(Number) as [number, number, number];
  const next = schedule === "weekly" ? new Date(Date.UTC(y, m - 1, d + 7)) : new Date(Date.UTC(y, m, 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}
