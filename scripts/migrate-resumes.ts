/**
 * One-time backfill: reads resume files from a local folder (downloaded
 * manually from the old Lovable project's Storage bucket, renamed by
 * Lovable to UUIDs) and writes them into `resume_data` (base64) on the
 * matching rows already migrated into student_applications.
 *
 * Matches files to rows by UUID filename: it takes the filename (without extension),
 * normalizes it, and matches against the resume_name column (which should be a UUID).
 *
 * Run this AFTER scripts/migrate-lovable.ts --commit, since it only fills
 * in rows that already exist and have a resume_name but no resume_data.
 *
 * Setup:
 *   1. Put all the downloaded resume files into a single folder.
 *   2. Either name that folder "lovable-resumes" in your project root, or
 *      point RESUME_DIR at wherever it actually is.
 *
 * Usage:
 *   npx tsx scripts/migrate-resumes.ts
 *       -> DRY RUN (default). Lists matches/misses, writes nothing.
 *
 *   npx tsx scripts/migrate-resumes.ts --commit
 *       -> Actually writes resume_data for every matched file.
 *
 *   RESUME_DIR="C:\Users\jerem\Downloads\lovable-resumes" npx tsx scripts/migrate-resumes.ts
 *       -> Use a custom folder path instead of the default.
 *
 * Safe to re-run: only touches rows where resume_data is still null.
 */

import fs from "fs";
import path from "path";
import { getSupabaseServerClient } from "../lib/supabase-server";

const COMMIT = process.argv.includes("--commit");
const RESUME_DIR =
  process.env.RESUME_DIR || path.join(process.cwd(), "lovable-resumes");

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  if (!fs.existsSync(RESUME_DIR)) {
    console.error(
      `Folder not found: ${RESUME_DIR}\n` +
        `Either create a "lovable-resumes" folder in your project root and put the downloaded files there, ` +
        `or set RESUME_DIR to wherever they actually are.`,
    );
    process.exit(1);
  }

  const files = fs
    .readdirSync(RESUME_DIR)
    .filter((f) => fs.statSync(path.join(RESUME_DIR, f)).isFile());

  // Build a map of normalized filename (without extension) -> actual filename
  const fileMap = new Map();
  for (const file of files) {
    const nameWithoutExt = path.parse(file).name; // Removes .pdf, .docx, etc.
    const norm = normalize(nameWithoutExt);
    fileMap.set(norm, file);
  }

  const supabase = getSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("student_applications")
    .select("id, first_name, last_name, email, resume_name, resume_data")
    .not("resume_name", "is", null)
    .is("resume_data", null);

  if (error) throw error;

  if (!rows || rows.length === 0) {
    console.log(
      "No rows need a resume backfill — all done, or none have resume_name set.",
    );
    return;
  }

  console.log(`Folder: ${RESUME_DIR} (${files.length} files found on disk)`);
  console.log(
    `${rows.length} rows need resume_data, matching by UUID filename.\n`,
  );

  let matched = 0;
  let missing = 0;

  for (const row of rows) {
    const label =
      `${row.first_name ?? ""} ${row.last_name ?? ""} <${row.email ?? "no email"}> (${row.id})`.trim();
    const resumeName = (row.resume_name as string) || "";

    // Get the filename without extension and normalize it
    const nameWithoutExt = path.parse(resumeName).name;
    const normResumeName = normalize(nameWithoutExt);

    if (!normResumeName) {
      console.warn(
        `  ? ${label} — no usable resume_name to match against, skipping`,
      );
      missing++;
      continue;
    }

    // Look for the file in our map
    const matchedFile = fileMap.get(normResumeName);

    if (!matchedFile) {
      console.warn(`  ✗ ${label} — no file matched for "${resumeName}"`);
      missing++;
      continue;
    }

    const buffer = fs.readFileSync(path.join(RESUME_DIR, matchedFile));
    const base64 = buffer.toString("base64");
    console.log(
      `  ✓ ${label} — "${matchedFile}" (${(base64.length / 1024).toFixed(0)} KB base64)`,
    );
    matched++;

    if (COMMIT) {
      const { error: updateError } = await supabase
        .from("student_applications")
        .update({ resume_data: base64 })
        .eq("id", row.id);

      if (updateError) {
        console.warn(
          `    ! failed to save resume_data for ${label}: ${updateError.message}`,
        );
      }
    }
  }

  console.log(`\n${matched} matched, ${missing} missing.`);

  if (!COMMIT) {
    console.log(
      "Dry run only — nothing written. Re-run with --commit once this looks right.",
    );
  } else {
    console.log("resume_data written for all matched files.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
