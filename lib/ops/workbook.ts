// lib/ops/workbook.ts
//
// Reads one tab of the weekly production workbook (exported to CSV) into
// operator-day aggregates. Two layouts exist (Nov 2 brief):
//
//   W41:      A Device ID · B Operator ID · C Operator Name · D Operational
//             Status · E Equipment Status · then F/G/H, I/J/K… day groups
//   W42/W43:  A Device ID · B State · C Operator ID · D Operator Name ·
//             E Operational Status · F Equipment Status · then G/H/I…
//
// Each day group is Commit / Submitted / Accepted; the calendar date sits
// in the row above the headers (row 7). Columns are found by header text,
// not fixed letters, so both layouts go through the same code.
//
// Rules carried from the brief:
//   - dates come from the date row, never from the "W41" tab label
//   - Submitted/Accepted are h:mm:ss durations → seconds
//   - Commit is a plain number with an unconfirmed unit
//   - blank Accepted = unknown, not zero
//   - the sheet's printed totals are kept as source values and compared,
//     never shown as reconciled actuals
//   - values with no dated header, or no operator ID, are rejected

import { columnLetter, isFormulaLike } from "./csv";
import { parseDuration, type NumericDurationUnit } from "./duration";

export interface DayGroup {
  startCol: number;
  columns: string; // "G–I"
  dateRaw: string;
  date: string | null; // YYYY-MM-DD
}

export interface ProductionCell {
  sourceRow: number; // 1-based, as in the spreadsheet
  operatorId: string;
  date: string;
  commit: number | null;
  submittedSeconds: number | null;
  acceptedSeconds: number | null;
  deviceId: string | null;
  deviceIdOriginal: string | null;
  operationalStatus: string;
  equipmentStatus: string;
}

export interface TabOperator {
  operatorId: string;
  // Private. Only used to create the protected person record on commit.
  name: string;
  state: string;
  placeholder: boolean;
  deviceId: string | null;
  sourceRow: number;
  operationalStatus: string;
}

export interface Rejected {
  row: number;
  column?: string;
  reason: string;
}

export interface Discrepancy {
  scope: string; // "Total Submit" or "Daily total 10/23"
  sourceRaw: string;
  sourceValue: string;
  recomputed: string;
}

export interface ParsedTab {
  layout: "w41" | "w42";
  headerRow: number;
  groups: DayGroup[];
  cells: ProductionCell[];
  operators: TabOperator[];
  rejected: Rejected[];
  warnings: string[];
  sourceTotals: { label: string; raw: string }[];
  discrepancies: Discrepancy[];
  recomputed: {
    commit: number;
    submittedSeconds: number;
    acceptedSeconds: number;
    submittedCells: number;
    acceptedCells: number;
  };
}

export interface ParseTabOptions {
  /** Year for dates written without one ("Oct 23"). */
  defaultYear?: number;
  /** Manual overrides, keyed by group start column letter → YYYY-MM-DD. */
  groupDates?: Record<string, string>;
  numericDurationUnit?: NumericDurationUnit;
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function iso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

/** Accepts 2026-10-23, 10/23/2026, 10/23/26, Oct 23, 23-Oct-2026, "Thursday, October 23, 2026". */
export function parseSheetDate(raw: string, defaultYear?: number): string | null {
  const v = raw.trim().replace(/\s+/g, " ");
  if (!v) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(v);
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : defaultYear;
    return y ? iso(y, +m[1], +m[2]) : null;
  }
  const lower = v.toLowerCase().replace(/^[a-z]+day,? /, "");
  m = /^([a-z]{3})[a-z]*\.? (\d{1,2})(?:,? (\d{4}))?$/.exec(lower);
  if (m && MONTHS.includes(m[1])) {
    const y = m[3] ? +m[3] : defaultYear;
    return y ? iso(y, MONTHS.indexOf(m[1]) + 1, +m[2]) : null;
  }
  m = /^(\d{1,2})[- ]([a-z]{3})[a-z]*(?:[- ](\d{2}|\d{4}))?$/.exec(lower);
  if (m && MONTHS.includes(m[2])) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : defaultYear;
    return y ? iso(y, MONTHS.indexOf(m[2]) + 1, +m[1]) : null;
  }
  return null;
}

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

/** e.g. Household_a6 — rows that may stand in for a not-yet-recruited person. */
export function looksLikePlaceholder(name: string): boolean {
  return /^household[\s_-]*[a-z0-9]+$/i.test(name.trim());
}

function parseNumber(raw: string): number | null | "invalid" {
  const v = raw.trim().replace(/,/g, "");
  if (v === "") return null;
  return /^-?\d+(?:\.\d+)?$/.test(v) ? Number(v) : "invalid";
}

export function parseProductionTab(grid: string[][], opts: ParseTabOptions = {}): ParsedTab | { error: string } {
  const headerIdx = grid.findIndex((r) => r.some((c) => norm(c) === "operator id"));
  if (headerIdx === -1) return { error: 'No header row with an "Operator ID" column was found.' };
  const header = grid[headerIdx].map(norm);
  const col = (name: string) => header.indexOf(name);

  const opCol = col("operator id");
  const deviceCol = col("device id");
  const stateCol = col("state");
  const nameCol = col("operator name");
  const opStatusCol = col("operational status");
  const eqStatusCol = col("equipment status");
  const layout: ParsedTab["layout"] = stateCol === -1 ? "w41" : "w42";
  const fixedEnd = Math.max(opCol, deviceCol, stateCol, nameCol, opStatusCol, eqStatusCol);

  const dateRow = grid[headerIdx - 1] ?? [];
  const groups: DayGroup[] = [];
  for (let c = fixedEnd + 1; c + 2 < header.length + 1; c++) {
    if (
      header[c]?.startsWith("commit") &&
      header[c + 1]?.startsWith("submit") &&
      header[c + 2]?.startsWith("accept")
    ) {
      const letter = columnLetter(c);
      const dateRaw = [dateRow[c], dateRow[c + 1], dateRow[c + 2]].find((v) => v?.trim()) ?? "";
      const override = opts.groupDates?.[letter];
      groups.push({
        startCol: c,
        columns: `${letter}–${columnLetter(c + 2)}`,
        dateRaw: dateRaw.trim(),
        date: override ? parseSheetDate(override) : parseSheetDate(dateRaw, opts.defaultYear),
      });
      c += 2;
    }
  }
  if (groups.length === 0) return { error: "No Commit / Submitted / Accepted column groups were found." };
  const lastGroupEnd = groups[groups.length - 1].startCol + 2;

  const rejected: Rejected[] = [];
  const warnings: string[] = [];
  const cells: ProductionCell[] = [];
  const operators: TabOperator[] = [];
  const seenOperatorDay = new Set<string>();
  const dailyTotals: { row: number; cells: string[] }[] = [];
  const unit = opts.numericDurationUnit ?? "reject";

  for (const g of groups) {
    if (!g.date) {
      warnings.push(
        `Columns ${g.columns}: date "${g.dateRaw || "(blank)"}" couldn't be read — values there are rejected until a date is confirmed.`,
      );
    }
  }

  // Printed summary figures above the header ("Total Commit" → next cell).
  const sourceTotals: { label: string; raw: string }[] = [];
  for (let r = 0; r < headerIdx; r++) {
    const row = grid[r];
    row.forEach((cell, c) => {
      if (/^total (commit|submit|submitted|accept|accepted)$/i.test(cell.trim())) {
        const raw = row.slice(c + 1).find((v) => v.trim()) ?? grid[r + 1]?.[c] ?? "";
        sourceTotals.push({ label: cell.trim(), raw: raw.trim() });
      }
    });
  }

  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    const sourceRow = r + 1;
    const get = (c: number) => (c >= 0 ? (row[c] ?? "") : "");
    const fixedCells = row.slice(0, fixedEnd + 1);

    if (fixedCells.some((c) => /total/i.test(c))) {
      dailyTotals.push({ row: sourceRow, cells: row });
      continue;
    }

    const formula = row.findIndex((c) => isFormulaLike(c));
    if (formula !== -1) {
      rejected.push({ row: sourceRow, column: columnLetter(formula), reason: "formula-like text; export values, not formulas" });
      continue;
    }

    const operatorId = get(opCol).trim();
    const hasValues = row.some((c, i) => i > fixedEnd && c.trim() !== "");
    if (!operatorId) {
      if (hasValues) rejected.push({ row: sourceRow, reason: "values without an operator ID" });
      continue;
    }

    const deviceOriginal = deviceCol >= 0 ? get(deviceCol) : "";
    const deviceId = deviceOriginal.trim() || null;
    if (deviceOriginal && deviceOriginal !== deviceOriginal.trim()) {
      warnings.push(`Row ${sourceRow}: device ID "${deviceOriginal}" has surrounding whitespace — trimmed to "${deviceId}", original kept.`);
    }
    const name = get(nameCol).trim();
    operators.push({
      operatorId,
      name,
      state: get(stateCol).trim(),
      placeholder: looksLikePlaceholder(name),
      deviceId,
      sourceRow,
      operationalStatus: get(opStatusCol).trim(),
    });

    for (let c = lastGroupEnd + 1; c < row.length; c++) {
      if (row[c]?.trim()) {
        rejected.push({ row: sourceRow, column: columnLetter(c), reason: "value outside the dated column headers" });
      }
    }

    for (const g of groups) {
      const [cRaw, sRaw, aRaw] = [get(g.startCol), get(g.startCol + 1), get(g.startCol + 2)];
      if (!cRaw.trim() && !sRaw.trim() && !aRaw.trim()) continue;
      if (!g.date) {
        rejected.push({ row: sourceRow, column: g.columns, reason: "no verified date for this column group" });
        continue;
      }
      const key = `${operatorId}|${g.date}`;
      if (seenOperatorDay.has(key)) {
        rejected.push({ row: sourceRow, column: g.columns, reason: `operator ${operatorId} already has a row for ${g.date} in this tab` });
        continue;
      }
      const commit = parseNumber(cRaw);
      const submitted = parseDuration(sRaw, unit);
      const accepted = parseDuration(aRaw, unit);
      const problems = [
        commit === "invalid" ? `Commit "${cRaw}" is not a number` : null,
        submitted.ok ? null : `Submitted: ${submitted.error}`,
        accepted.ok ? null : `Accepted: ${accepted.error}`,
      ].filter(Boolean);
      if (problems.length) {
        rejected.push({ row: sourceRow, column: g.columns, reason: problems.join("; ") });
        continue;
      }
      seenOperatorDay.add(key);
      cells.push({
        sourceRow,
        operatorId,
        date: g.date,
        commit: commit as number | null,
        submittedSeconds: submitted.ok ? submitted.seconds : null,
        acceptedSeconds: accepted.ok ? accepted.seconds : null,
        deviceId,
        deviceIdOriginal: deviceOriginal || null,
        operationalStatus: get(opStatusCol).trim(),
        equipmentStatus: get(eqStatusCol).trim(),
      });
    }
  }

  // Shared or near-duplicate devices: flag, don't merge or reject.
  const byDevice = new Map<string, Set<string>>();
  const byLoose = new Map<string, Set<string>>();
  for (const o of operators) {
    if (!o.deviceId) continue;
    (byDevice.get(o.deviceId) ?? byDevice.set(o.deviceId, new Set()).get(o.deviceId)!).add(o.operatorId);
    const loose = o.deviceId.toLowerCase().replace(/[^a-z0-9]/g, "");
    (byLoose.get(loose) ?? byLoose.set(loose, new Set()).get(loose)!).add(o.deviceId);
  }
  for (const [device, ops] of byDevice) {
    if (ops.size > 1) {
      warnings.push(`Device ${device} is listed for ${ops.size} operators (${[...ops].join(", ")}) — may be real camera sharing; check for overlapping use.`);
    }
  }
  for (const ids of byLoose.values()) {
    if (ids.size > 1) warnings.push(`Device IDs ${[...ids].map((i) => `"${i}"`).join(" and ")} differ only in spacing/case/punctuation — possible typo, not merged.`);
  }
  for (const o of operators) {
    if (o.placeholder) warnings.push(`Row ${o.sourceRow}: "${o.operatorId}" looks like a placeholder — imported as unconfirmed, not counted as a person until confirmed.`);
  }

  const recomputed = {
    commit: cells.reduce((s, c) => s + (c.commit ?? 0), 0),
    submittedSeconds: cells.reduce((s, c) => s + (c.submittedSeconds ?? 0), 0),
    acceptedSeconds: cells.reduce((s, c) => s + (c.acceptedSeconds ?? 0), 0),
    submittedCells: cells.filter((c) => c.submittedSeconds !== null).length,
    acceptedCells: cells.filter((c) => c.acceptedSeconds !== null).length,
  };

  const discrepancies: Discrepancy[] = [];
  const fmt = (s: number) => `${(s / 3600).toFixed(2)} h`;
  for (const t of sourceTotals) {
    const kind = t.label.toLowerCase();
    if (kind.includes("commit")) {
      const n = parseNumber(t.raw);
      if (n !== recomputed.commit) {
        discrepancies.push({ scope: t.label, sourceRaw: t.raw, sourceValue: String(n ?? "blank"), recomputed: String(recomputed.commit) });
      }
    } else {
      const d = parseDuration(t.raw, unit);
      const ours = kind.includes("accept") ? recomputed.acceptedSeconds : recomputed.submittedSeconds;
      const theirs = d.ok ? d.seconds : null;
      if (theirs !== ours) {
        discrepancies.push({ scope: t.label, sourceRaw: t.raw, sourceValue: theirs === null ? "unreadable/blank" : fmt(theirs), recomputed: fmt(ours) });
      }
    }
  }
  for (const total of dailyTotals) {
    for (const g of groups) {
      const raw = total.cells[g.startCol + 1] ?? "";
      if (!raw.trim() || !g.date) continue;
      const d = parseDuration(raw, unit);
      const ours = cells.filter((c) => c.date === g.date).reduce((s, c) => s + (c.submittedSeconds ?? 0), 0);
      const theirs = d.ok ? d.seconds : null;
      if (theirs !== ours) {
        discrepancies.push({
          scope: `Daily total row ${total.row}, ${g.date} submitted`,
          sourceRaw: raw,
          sourceValue: theirs === null ? "unreadable" : fmt(theirs),
          recomputed: fmt(ours),
        });
      }
    }
  }

  return {
    layout,
    headerRow: headerIdx + 1,
    groups,
    cells,
    operators,
    rejected,
    warnings,
    sourceTotals,
    discrepancies,
    recomputed,
  };
}
