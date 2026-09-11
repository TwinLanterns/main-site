/**
 * One-time migration: OLD Lovable-generated `public.students` table
 * -> CURRENT `public.student_applications` table.
 *
 * (Only `students` had real data in the Lovable backup — `startups`/`roles`
 * are skipped entirely.)
 *
 * The old schema is only described in a SQL file, not live anywhere — you
 * need an actual running Postgres instance with your Lovable backup's DATA
 * restored into it before this script has anything to read. See the Docker
 * restore steps in README-admin-setup.md if you haven't done that yet.
 *
 * Usage:
 *   OLD_DATABASE_URL="postgres://user:pass@host:5432/db" npx tsx scripts/migrate-lovable.ts
 *       -> DRY RUN (default). Prints counts + sample rows, writes nothing.
 *
 *   OLD_DATABASE_URL="postgres://..." npx tsx scripts/migrate-lovable.ts --commit
 *       -> Actually writes to student_applications.
 *
 * Also needs your normal current-project env vars (SUPABASE_URL /
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) since it writes
 * through the same service-role client the app already uses.
 *
 * Requires the `pg` package: npm install --save-dev pg @types/pg tsx
 *
 * Safe to re-run: rows are upserted on their original `id`, so re-running
 * after a partial commit won't create duplicates.
 */

import { Client } from "pg";
// Adjust this import path to wherever supabase-server.ts actually lives in
// your repo (e.g. "../lib/supabase-server" if there's no "@/" alias for scripts).
import { getSupabaseServerClient } from "../lib/supabase-server";

const COMMIT = process.argv.includes("--commit");

// Loose type — this is a one-time script, not app code.
type OldStudent = Record<string, any>;

function studentToApplication(s: OldStudent) {
  const links =
    [s.linkedin_url, s.portfolio_url, s.website_url]
      .filter(Boolean)
      .join("\n") || null;

  return {
    id: s.id, // preserve original id -> re-running is idempotent
    first_name: s.first_name,
    last_name: s.last_name,
    email: s.email,
    phone: s.phone,
    school: s.university,
    grad_year: s.graduation_year,
    location: s.location,
    interests: s.categories ?? [],
    hours_per_week: s.hours_available,
    start_timing: s.start_date,
    work_setup: s.work_preference,
    priorities: [s.industry_interests, s.startup_stage_preference].filter(
      Boolean,
    ),
    built: s.experience_summary ?? null,
    links,
    resume_name: s.resume_url ? String(s.resume_url).split("/").pop() : null,
    resume_data: null,
    raw_payload: { migrated_from: "lovable_students", original: s },
    created_at: s.created_at,
  };
}

async function main() {
  const oldDbUrl = process.env.OLD_DATABASE_URL;
  if (!oldDbUrl) {
    console.error(
      "Set OLD_DATABASE_URL to a Postgres connection string for your restored Lovable backup.",
    );
    process.exit(1);
  }

  const oldDb = new Client({ connectionString: oldDbUrl });
  await oldDb.connect();

  const { rows: students } = await oldDb.query<OldStudent>(
    "select * from public.students",
  );

  await oldDb.end();

  const applications = students.map(studentToApplication);

  console.log(
    `students: ${students.length} -> student_applications: ${applications.length}`,
  );
  console.log("\nSample student_applications row:");
  console.log(JSON.stringify(applications[0], null, 2));

  if (!COMMIT) {
    console.log(
      "\nDry run only — nothing written. Re-run with --commit once this looks right.",
    );
    return;
  }

  const supabase = getSupabaseServerClient();

  if (applications.length > 0) {
    const { error } = await supabase
      .from("student_applications")
      .upsert(applications, { onConflict: "id" });
    if (error) throw error;
  }

  console.log(`\nWrote ${applications.length} student_applications rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
