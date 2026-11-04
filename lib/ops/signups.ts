// lib/ops/signups.ts
//
// Public program sign-ups (the rows /admin lists per program) as seen from
// an /ops project. A project names its program in ops_projects.
// signup_program (supabase/ops_signups.sql). Adding a sign-up to the CRM
// stores `<table>:<row id>` as the person's intake_ref, which is unique, so
// the same sign-up can't become two people and the list can show who's in.

export const SIGNUP_PROGRAMS = {
  gopro: {
    label: "GoPro home collector",
    tables: [{ table: "earn_gopro_applicants", qualifiedDefault: true }],
  },
  speech: {
    label: "Speech participant",
    tables: [{ table: "earn_speech_participants", qualifiedDefault: true }],
  },
  internship: {
    label: "Task filmer internship",
    tables: [
      { table: "earn_applicants_qualified", qualifiedDefault: true },
      // Legacy table, read-only since the screening questions were removed.
      { table: "earn_applicants_unqualified", qualifiedDefault: false },
    ],
  },
} as const;

export type SignupProgram = keyof typeof SIGNUP_PROGRAMS;

export function isSignupProgram(v: unknown): v is SignupProgram {
  return typeof v === "string" && Object.hasOwn(SIGNUP_PROGRAMS, v);
}

export function programTables(program: SignupProgram): string[] {
  return SIGNUP_PROGRAMS[program].tables.map((t) => t.table);
}

export interface Signup {
  /** `<table>:<id>`; becomes ops_people.intake_ref when added to the CRM. */
  ref: string;
  table: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  qualified: boolean;
  reasons: string[];
  createdAt: string;
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Normalizes one raw sign-up row. Returns null for rows without an id. */
export function toSignup(table: string, row: Record<string, unknown>, qualifiedDefault: boolean): Signup | null {
  const id = s(row.id);
  if (!id) return null;
  const name = [s(row.first_name), s(row.last_name)].filter(Boolean).join(" ") || s(row.name) || s(row.email);
  return {
    ref: `${table}:${id}`,
    table,
    id,
    name,
    email: s(row.email).toLowerCase(),
    phone: s(row.phone),
    location: s(row.location) || s(row.region),
    qualified: typeof row.qualified === "boolean" ? row.qualified : qualifiedDefault,
    reasons: Array.isArray(row.disqualified_reasons) ? row.disqualified_reasons.filter((r): r is string => typeof r === "string") : [],
    createdAt: s(row.created_at),
  };
}

/** Splits a ref into table + id, only for tables belonging to `program`. */
export function parseSignupRef(ref: string, program: SignupProgram): { table: string; id: string } | null {
  const i = ref.lastIndexOf(":");
  if (i <= 0) return null;
  const table = ref.slice(0, i);
  const id = ref.slice(i + 1);
  if (!programTables(program).includes(table)) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return { table, id };
}
