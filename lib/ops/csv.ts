// lib/ops/csv.ts
//
// Small RFC 4180 reader (quoted fields, embedded commas/newlines, "" escapes)
// plus the guards imports and exports share. No dependency: the inputs are
// sanitized tracker exports, a few hundred rows at most.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  // Strip a UTF-8 BOM from Excel exports.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** 0 → "A", 26 → "AA" */
export function columnLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/**
 * Text a spreadsheet would execute when the value is exported back out
 * (=, +, -, @, tab, CR). Plain signed numbers aren't formulas.
 */
export function isFormulaLike(value: string): boolean {
  const v = value.trimStart();
  if (!/^[=+\-@\t\r]/.test(value) && !/^[=+\-@]/.test(v)) return false;
  return !/^[+-]?\d+(?:\.\d+)?$/.test(v);
}

/** One CSV cell for export, defused against formula injection. */
export function csvCell(value: unknown): string {
  let v = value === null || value === undefined ? "" : String(value);
  if (isFormulaLike(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
