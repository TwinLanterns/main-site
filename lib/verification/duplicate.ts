// lib/verification/duplicate.ts
//
// Cross-checked before a code is even sent (fast rejection) and again right
// before the row is saved (closes the race between "send code" and
// "submit"). Partner applicants land in one of two tables depending on
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

  if (error) {
    console.error(`duplicate check failed (${table}.${column})`, error);
    return false;
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
    case "partner_applicant": {
      const [qualified, unqualified] = await Promise.all([
        existsIn(supabase, "partner_applicants_qualified", "email", email),
        existsIn(supabase, "partner_applicants_unqualified", "email", email),
      ]);
      return qualified || unqualified;
    }
    case "partner_gopro":
      return existsIn(supabase, "partner_gopro_applicants", "email", email);
    case "partner_ambassador":
      return existsIn(supabase, "partner_ambassadors", "email", email);
  }
}
