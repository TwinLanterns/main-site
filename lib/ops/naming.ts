// lib/ops/naming.ts
//
// File-path checks for the household guide's convention:
//
//   <operator folder>/<MM-DD-YYYY>/<room>/<task-name>-<Static|Movement>-<NN>.mp4
//
// e.g. OP-007/10-23-2026/kitchen/laundry-to-basket-Static-01.mp4
//
// Task names contain hyphens, so the mode and take number are parsed from
// the right. A pass means the path is well-formed — it says nothing about
// footage quality or customer acceptance. Several details are unconfirmed
// (task vocabulary, take width, extension case, cross-room form), so those
// produce warnings rather than failures until the project owner confirms.

export const GUIDE_RULE_VERSION = "household-guide-v1 (proposed — pending confirmation)";

export const ROOMS = [
  "dining_area",
  "kitchen",
  "kids_room",
  "bathroom",
  "laundry_room",
  "bedroom",
  "living_room",
  "hallway",
  "entryway",
] as const;

export const UNCONFIRMED_RULES = [
  "Permitted task-name vocabulary (any lowercase hyphenated name is accepted for now).",
  "Take-number width (two digits assumed; other widths warn).",
  "Extension case (.mp4 expected; .MP4 warns).",
  "Whether the date folder is the recording date or the upload date.",
  "How cross-room folders are ordered when joined with “+”.",
];

export interface NamingIssue {
  level: "error" | "warning";
  message: string;
}

export interface ParsedPath {
  operatorFolder: string | null;
  dateFolder: string | null;
  date: string | null; // YYYY-MM-DD
  rooms: string[];
  filename: string;
  task: string | null;
  mode: "Static" | "Movement" | null;
  take: number | null;
}

export interface NamingResult {
  status: "valid" | "warning" | "invalid";
  issues: NamingIssue[];
  parsed: ParsedPath;
  /** Corrected path, when every problem had a mechanical fix. */
  suggestion: string | null;
}

export interface NamingContext {
  /** Operator folder names known for the project (anonymous or source IDs). */
  knownOperators?: Set<string>;
  /** Paths already in the manifest for the project. */
  existingPaths?: Set<string>;
}

const FILE_RE = /^(.+)-(static|movement)-(\d+)$/i;
const TASK_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slug(s: string) {
  return s.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function parseFolderDate(s: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (!m) return null;
  const [, mm, dd, yyyy] = m.map(Number);
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  return dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd ? dt.toISOString().slice(0, 10) : null;
}

export function normalizePath(path: string) {
  return path.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

export function validateFilePath(rawPath: string, ctx: NamingContext = {}): NamingResult {
  const path = normalizePath(rawPath);
  const parts = path.split("/").filter(Boolean);
  const issues: NamingIssue[] = [];
  const error = (message: string) => issues.push({ level: "error", message });
  const warn = (message: string) => issues.push({ level: "warning", message });

  const filename = parts[parts.length - 1] ?? "";
  const folders = parts.slice(0, -1);
  const parsed: ParsedPath = {
    operatorFolder: null,
    dateFolder: null,
    date: null,
    rooms: [],
    filename,
    task: null,
    mode: null,
    take: null,
  };
  let fixable = true;
  const fixed = { operator: "", date: "", room: "", file: "" };

  // --- folders ---------------------------------------------------------
  if (folders.length === 0) {
    warn("Only a filename was given — operator, date and room folders are unchecked.");
  } else if (folders.length !== 3) {
    error(`Expected operator/date/room/file (4 levels), got ${parts.length}.`);
    fixable = false;
  }
  if (folders.length === 3) {
    const [op, date, room] = folders;
    parsed.operatorFolder = op;
    parsed.dateFolder = date;
    fixed.operator = op;

    if (ctx.knownOperators && ctx.knownOperators.size > 0 && !ctx.knownOperators.has(op)) {
      error(`Operator folder "${op}" doesn't match any operator on this project.`);
      fixable = false;
    }

    parsed.date = parseFolderDate(date);
    fixed.date = date;
    if (!parsed.date) {
      const alt = /^(\d{1,2})[-_.\/](\d{1,2})[-_.\/](\d{4})$/.exec(date);
      const candidate = alt ? `${alt[1].padStart(2, "0")}-${alt[2].padStart(2, "0")}-${alt[3]}` : null;
      if (candidate && parseFolderDate(candidate)) {
        error(`Date folder "${date}" should be MM-DD-YYYY.`);
        fixed.date = candidate;
        parsed.date = parseFolderDate(candidate);
      } else {
        error(`Date folder "${date}" is not a valid MM-DD-YYYY date.`);
        fixable = false;
      }
    }

    const rooms = room.split("+");
    const fixedRooms: string[] = [];
    for (const r of rooms) {
      const candidate = r.trim().toLowerCase().replace(/[\s-]+/g, "_");
      if ((ROOMS as readonly string[]).includes(r)) fixedRooms.push(r);
      else if ((ROOMS as readonly string[]).includes(candidate)) {
        error(`Room folder "${r}" should be "${candidate}".`);
        fixedRooms.push(candidate);
      } else {
        error(`"${r}" is not a recognized room (${ROOMS.join(", ")}).`);
        fixable = false;
      }
    }
    parsed.rooms = fixedRooms;
    fixed.room = fixedRooms.join("+");
  }

  // --- filename --------------------------------------------------------
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot + 1) : "";
  let fixedExt = ext;
  if (ext === "mp4") {
    // ok
  } else if (ext.toLowerCase() === "mp4") {
    warn(`Extension ".${ext}" — lowercase ".mp4" expected (case requirement unconfirmed).`);
    fixedExt = "mp4";
  } else {
    error(ext ? `Extension ".${ext}" — expected ".mp4".` : "Missing .mp4 extension.");
    if (ext) fixable = false;
    fixedExt = "mp4";
  }

  const m = FILE_RE.exec(stem);
  if (!m) {
    error('Filename must end in "-Static-NN" or "-Movement-NN" before the extension.');
    fixable = false;
  } else {
    const [, task, modeRaw, takeRaw] = m;
    const mode = modeRaw.toLowerCase() === "static" ? "Static" : "Movement";
    parsed.task = task;
    parsed.mode = mode;
    parsed.take = Number(takeRaw);

    let fixedTask = task;
    if (!TASK_RE.test(task)) {
      const s = slug(task);
      if (s) {
        error(`Task name "${task}" should be lowercase words joined by hyphens ("${s}").`);
        fixedTask = s;
      } else {
        error(`Task name "${task}" is not usable.`);
        fixable = false;
      }
    }
    if (modeRaw !== mode) error(`Capture mode "${modeRaw}" should be written "${mode}".`);
    if (parsed.take === 0) {
      error("Take numbers start at 01.");
      fixable = false;
    }
    let fixedTake = takeRaw;
    if (takeRaw.length !== 2) {
      warn(`Take "${takeRaw}" — two digits assumed (width unconfirmed).`);
      if (parsed.take < 100) fixedTake = String(parsed.take).padStart(2, "0");
    }
    fixed.file = `${fixedTask}-${mode}-${fixedTake}.${fixedExt}`;
  }

  const fullPath = parts.join("/");
  if (ctx.existingPaths?.has(fullPath)) {
    warn("This path is already in the manifest — a possible conflict, not proof of duplicate footage.");
  }

  const hasError = issues.some((i) => i.level === "error");
  const status = hasError ? "invalid" : issues.length ? "warning" : "valid";
  let suggestion: string | null = null;
  if (fixable && issues.length) {
    const s = folders.length === 3 ? `${fixed.operator}/${fixed.date}/${fixed.room}/${fixed.file}` : fixed.file;
    if (s && s !== fullPath) suggestion = s;
  }
  return { status, issues, parsed, suggestion };
}
