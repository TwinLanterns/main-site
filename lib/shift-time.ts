// lib/shift-time.ts
//
// Filming shifts are in-person, so every time is shown and entered in one
// fixed zone rather than each viewer's own. Fixing it also keeps server and
// client rendering identical (no hydration mismatch from a UTC server).
// Shared by the public board, the admin tab and the admin API.

export const SHIFT_TIME_ZONE = "America/Los_Angeles";
export const SHIFT_TIME_ZONE_LABEL = "Pacific time";

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SHIFT_TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SHIFT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const keyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHIFT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "Monday, November 2" */
export function formatShiftDay(iso: string): string {
  return dayFormat.format(new Date(iso));
}

/** "9:00 AM – 1:00 PM" */
export function formatShiftRange(startIso: string, endIso: string): string {
  return `${timeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`;
}

/** "2026-11-02" in the shift zone — for grouping shifts by day. */
export function shiftDayKey(iso: string): string {
  return keyFormat.format(new Date(iso));
}

function zoneOffsetMs(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SHIFT_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wall - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * Wall-clock date + time in the shift zone → UTC instant.
 * `date` is "YYYY-MM-DD", `time` is "HH:mm". Returns null if malformed.
 */
export function shiftTimeToUtc(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const asUtc = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  // Second pass corrects the guess when it lands across a DST change.
  const guess = new Date(asUtc.getTime() - zoneOffsetMs(asUtc));
  return new Date(asUtc.getTime() - zoneOffsetMs(guess));
}
