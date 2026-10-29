// lib/submissions/film-shift-codes.ts
//
// Admin side of the shift-board access codes (app/api/admin/shifts/codes):
// create one random code per filmer, email it, resend it, revoke it.
// Filmers redeem codes through lib/shift-access.ts.

import { isValidEmail } from "@/lib/validation";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";
import { LEGAL } from "@/lib/legal";
import { generateShiftCode } from "@/lib/shift-access";
import { formatShiftCode } from "@/lib/shift-code";
import { sendShiftCodeEmail } from "@/lib/email/shift-emails";

export interface ShiftCodeRow {
  id: string;
  code: string;
  name: string;
  email: string;
}

export interface ParsedPeople {
  people: { name: string; email: string }[];
  /** Lines that weren't "Name, email". */
  invalid: string[];
}

export interface AddPeopleResult {
  created: number;
  /** Already had a code; it was kept (and resent if sending). */
  existing: number;
  sent: number;
  failed: { email: string; error: string }[];
}

export class ShiftCodeError extends Error {}

const MAX_PEOPLE = 200;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function client() {
  return getSupabaseOrThrow(
    (err) =>
      new ShiftCodeError(err instanceof Error ? err.message : "Supabase not configured"),
  );
}

// The link is emailed, so never build it from request headers (see
// app/api/earn/refer).
function shiftsLink(code: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || LEGAL.site).replace(/\/$/, "");
  return `${origin}/shifts?code=${encodeURIComponent(formatShiftCode(code))}`;
}

/**
 * One person per line: "Jane Doe, jane@example.com" or
 * "Jane Doe <jane@example.com>". Duplicate emails are collapsed.
 */
export function parsePeople(raw: string): ParsedPeople {
  const seen = new Set<string>();
  const people: ParsedPeople["people"] = [];
  const invalid: string[] = [];

  for (const line of raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^(.+?)\s*(?:,|<)\s*([^\s<>,]+@[^\s<>,]+)\s*>?$/);
    const name = m?.[1].trim().slice(0, 200) ?? "";
    const email = m?.[2].trim().toLowerCase().slice(0, 200) ?? "";
    if (name.length < 2 || !isValidEmail(email)) {
      invalid.push(line.slice(0, 200));
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    people.push({ name, email });
  }

  return { people: people.slice(0, MAX_PEOPLE), invalid };
}

async function send(row: ShiftCodeRow): Promise<string | null> {
  try {
    await sendShiftCodeEmail({
      name: row.name,
      email: row.email,
      code: formatShiftCode(row.code),
      link: shiftsLink(row.code),
    });
  } catch (err) {
    console.error("shift code email failed", row.email, err);
    return err instanceof Error ? err.message : "Email failed";
  }
  const { error } = await client()
    .from("film_shift_codes")
    .update({ emailed_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) console.error("film_shift_codes emailed_at update failed", error);
  return null;
}

async function insertWithFreshCode(person: { name: string; email: string }) {
  // A clash in ~40 bits is vanishingly rare, but retry rather than fail.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await client()
      .from("film_shift_codes")
      .insert({ ...person, code: generateShiftCode() })
      .select("id, code, name, email")
      .single<ShiftCodeRow>();
    if (!error) return data;
    if (error.code !== "23505" || !error.message.includes("code")) {
      console.error("supabase insert error (film_shift_codes)", error);
      throw new ShiftCodeError(error.message);
    }
  }
  throw new ShiftCodeError("Couldn't generate a unique code — try again.");
}

/** Gives everyone a code (keeping existing ones) and optionally emails them. */
export async function addPeople(
  people: ParsedPeople["people"],
  sendEmails: boolean,
): Promise<AddPeopleResult> {
  const { data: existingRows, error } = await client()
    .from("film_shift_codes")
    .select("id, code, name, email")
    .in("email", people.map((p) => p.email));
  if (error) {
    console.error("supabase select error (film_shift_codes)", error);
    throw new ShiftCodeError(error.message);
  }

  const byEmail = new Map((existingRows ?? []).map((r) => [r.email.toLowerCase(), r]));
  const result: AddPeopleResult = { created: 0, existing: 0, sent: 0, failed: [] };
  const rows: ShiftCodeRow[] = [];

  for (const person of people) {
    const existing = byEmail.get(person.email);
    if (existing) {
      result.existing++;
      rows.push(existing);
    } else {
      rows.push(await insertWithFreshCode(person));
      result.created++;
    }
  }

  if (sendEmails) {
    for (const row of rows) {
      const err = await send(row);
      if (err) result.failed.push({ email: row.email, error: err });
      else result.sent++;
    }
  }

  return result;
}

async function getRow(id: string): Promise<ShiftCodeRow> {
  if (!UUID_RE.test(id)) throw new ShiftCodeError("Invalid code id");
  const { data, error } = await client()
    .from("film_shift_codes")
    .select("id, code, name, email")
    .eq("id", id)
    .maybeSingle<ShiftCodeRow>();
  if (error) throw new ShiftCodeError(error.message);
  if (!data) throw new ShiftCodeError("That code no longer exists.");
  return data;
}

export async function resendCode(id: string): Promise<void> {
  const err = await send(await getRow(id));
  if (err) throw new ShiftCodeError(err);
}

/** Deleting the row also locks out every browser the code unlocked. */
export async function revokeCode(id: string): Promise<void> {
  if (!UUID_RE.test(id)) throw new ShiftCodeError("Invalid code id");
  const { error } = await client().from("film_shift_codes").delete().eq("id", id);
  if (error) {
    console.error("supabase delete error (film_shift_codes)", error);
    throw new ShiftCodeError(error.message);
  }
}
