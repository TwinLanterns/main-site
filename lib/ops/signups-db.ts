// lib/ops/signups-db.ts
//
// Loads a program's sign-ups and, for each, whether it's already a person
// in the CRM and enrolled in the given project.

import { db } from "./db";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { SIGNUP_PROGRAMS, toSignup, type Signup, type SignupProgram } from "./signups";

export interface SignupWithStatus extends Signup {
  personId: string | null;
  /** Enrollment in this project, if any. */
  enrollment: { id: string; code: string } | null;
}

export async function loadSignups(program: SignupProgram, projectId: string): Promise<{ rows: SignupWithStatus[]; error: string | null }> {
  const supabase = db();
  const results = await Promise.all(
    SIGNUP_PROGRAMS[program].tables.map(async ({ table, qualifiedDefault }) => {
      const res = await fetchAllRows((from, to) =>
        supabase.from(table).select("*").order("created_at", { ascending: false }).order("id", { ascending: true }).range(from, to),
      );
      return { ...res, table, qualifiedDefault };
    }),
  );
  const failed = results.find((r) => r.error);
  if (failed) return { rows: [], error: `${failed.table}: ${failed.error!.message}` };

  const signups = results
    .flatMap((r) => (r.data ?? []).map((row) => toSignup(r.table, row as Record<string, unknown>, r.qualifiedDefault)))
    .filter((x): x is Signup => x !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Match by table prefix rather than listing every ref (URL length).
  const [people, enrollments] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("ops_people")
        .select("id, intake_ref")
        .or(SIGNUP_PROGRAMS[program].tables.map(({ table }) => `intake_ref.like.${table}:*`).join(","))
        .order("id")
        .range(from, to),
    ),
    fetchAllRows((from, to) => supabase.from("ops_enrollments").select("id, person_id, anonymous_code").eq("project_id", projectId).order("id").range(from, to)),
  ]);
  if (people.error) return { rows: [], error: people.error.message };
  if (enrollments.error) return { rows: [], error: enrollments.error.message };
  const personByRef = new Map((people.data ?? []).map((p) => [p.intake_ref as string, p.id as string]));
  const enrollmentByPerson = new Map((enrollments.data ?? []).map((e) => [e.person_id as string, { id: e.id as string, code: e.anonymous_code as string }]));

  return {
    rows: signups.map((x) => {
      const personId = personByRef.get(x.ref) ?? null;
      return { ...x, personId, enrollment: personId ? enrollmentByPerson.get(personId) ?? null : null };
    }),
    error: null,
  };
}
