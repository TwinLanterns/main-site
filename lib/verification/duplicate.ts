// lib/verification/duplicate.ts
//
// Cross-checked before a code is even sent (fast rejection) and again right
// before the row is saved (closes the race between "send code" and
// "submit"). Earn applicants land in one of two tables depending on
// eligibility, so that purpose checks both.

import { getSupabaseServerClient } from "@/lib/supabase-server";
import { VerificationConfigError } from "./store";
import type { VerificationPurpose } from "./types";

// Escape ILIKE wildcards so a literal % or _ in an email can't broaden the match.
function escapeForIlike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}

async function existsIn(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  table: string,
  column: string,
  email: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .ilike(column, email)
    .limit(1);

  // Fail closed: treating a failed lookup as "no duplicate" would let
  // duplicates through whenever the DB hiccups. Callers turn this into 502.
  if (error) {
    console.error(`duplicate check failed (${table}.${column})`, error);
    throw new Error(`Duplicate check failed (${table})`);
  }

  return Boolean(data && data.length);
}

export async function findDuplicateEmail(
  purpose: VerificationPurpose,
  rawEmail: string,
): Promise<boolean> {
  let supabase: ReturnType<typeof getSupabaseServerClient>;
  try {
    supabase = getSupabaseServerClient();
  } catch (err) {
    throw new VerificationConfigError(
      err instanceof Error ? err.message : "Supabase not configured",
    );
  }

  const email = escapeForIlike(rawEmail.trim());

  switch (purpose) {
    case "student":
      return existsIn(supabase, "student_applications", "email", email);
    case "company":
      return existsIn(supabase, "company_briefs", "contact_email", email);
    case "earn_applicant": {
      const [qualified, unqualified] = await Promise.all([
        existsIn(supabase, "earn_applicants_qualified", "email", email),
        existsIn(supabase, "earn_applicants_unqualified", "email", email),
      ]);
      return qualified || unqualified;
    }
    case "earn_gopro":
      return existsIn(supabase, "earn_gopro_applicants", "email", email);
    case "earn_speech":
      return existsIn(supabase, "earn_speech_participants", "email", email);
    case "earn_ambassador":
      return existsIn(supabase, "earn_ambassadors", "email", email);
  }
}
