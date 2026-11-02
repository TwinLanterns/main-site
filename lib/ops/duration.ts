// lib/ops/duration.ts
//
// Durations are stored as whole seconds and only rounded for display.
// Spreadsheet time cells (Excel built-in format 21, h:mm:ss) export to CSV
// as "2:33:02"; the underlying value is a fraction of a day, so a raw
// 0.10627… means 0.10627 × 86400 seconds — never 0.10627 hours.

export type NumericDurationUnit = "reject" | "fraction_of_day";

export type ParsedDuration =
  | { ok: true; seconds: number | null } // null = blank / not supplied
  | { ok: false; error: string };

const HMS_RE = /^(\d{1,4}):([0-5]\d):([0-5]\d)(?:\.\d+)?$/;
const NUMBER_RE = /^-?\d+(?:\.\d+)?$/;

export function parseDuration(
  raw: string,
  numericUnit: NumericDurationUnit = "reject",
): ParsedDuration {
  const v = raw.trim();
  if (v === "") return { ok: true, seconds: null };

  const hms = HMS_RE.exec(v);
  if (hms) {
    const [, h, m, s] = hms;
    return { ok: true, seconds: Number(h) * 3600 + Number(m) * 60 + Number(s) };
  }

  if (NUMBER_RE.test(v)) {
    const n = Number(v);
    if (n < 0) return { ok: false, error: `negative duration "${v}"` };
    if (numericUnit === "fraction_of_day") {
      return { ok: true, seconds: Math.round(n * 86400) };
    }
    return {
      ok: false,
      error: `bare number "${v}" — expected h:mm:ss; confirm the cell's unit before importing`,
    };
  }

  return { ok: false, error: `unreadable duration "${v}"` };
}

/** "12.4 h" (one decimal), or "—" for unknown. */
export function formatHours(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  return `${(seconds / 3600).toFixed(1)} h`;
}

/** "2:33:02" */
export function formatHMS(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Hours typed into a form ("1.5") → whole seconds, or null when blank. */
export function hoursToSeconds(raw: string): number | null | "invalid" {
  const v = raw.trim();
  if (v === "") return null;
  if (!NUMBER_RE.test(v) || Number(v) < 0) return "invalid";
  return Math.round(Number(v) * 3600);
}
