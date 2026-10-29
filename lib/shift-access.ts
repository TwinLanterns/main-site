/**
 * Per-person access codes for the filming shift board (/shifts).
 *
 * Admins create a random code for each filmer (film_shift_codes) and email
 * it. Entering it at /shifts sets an HMAC-signed cookie (same token format
 * as the admin session) that names the code's row. Every check looks the
 * row up again, so deleting a code in /admin locks that person out at once.
 */

import { randomInt } from "crypto";
import { createSessionToken, verifySessionToken } from "@/lib/admin-auth";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";
import { SHIFT_CODE_LENGTH, normalizeShiftCode } from "@/lib/shift-code";

/** Name of the httpOnly cookie that unlocks the shift board. */
export const SHIFT_ACCESS_COOKIE = "shift_access";

/** Cookie lifetime, in seconds (30 days). */
export const SHIFT_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

/** Token prefix is `shifts_<code id>`, so tokens can't cross over to admin. */
const TOKEN_PREFIX = "shifts_";

// No 0/O, 1/I/L: codes get read off phones and typed by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The filmer a valid code belongs to. */
export interface ShiftCodeHolder {
  id: string;
  name: string;
  email: string;
}

export class ShiftAccessConfigError extends Error {}

/** 8 characters from a 31-letter alphabet (~40 bits), stored without the dash. */
export function generateShiftCode() {
  let code = "";
  for (let i = 0; i < SHIFT_CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new ShiftAccessConfigError("ADMIN_SESSION_SECRET is not set");
  return s;
}

function client() {
  return getSupabaseOrThrow(
    (err) =>
      new ShiftAccessConfigError(
        err instanceof Error ? err.message : "Supabase not configured",
      ),
  );
}

/** Looks up a typed code; null when it doesn't exist. Records the use. */
export async function redeemShiftCode(input: string): Promise<ShiftCodeHolder | null> {
  const code = normalizeShiftCode(input);
  if (code.length !== SHIFT_CODE_LENGTH) return null;

  const supabase = client();
  const { data, error } = await supabase
    .from("film_shift_codes")
    .select("id, name, email")
    .eq("code", code)
    .maybeSingle<ShiftCodeHolder>();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { error: touchError } = await supabase
    .from("film_shift_codes")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  if (touchError) console.error("film_shift_codes last_used_at update failed", touchError);

  return data;
}

export function createShiftAccessToken(codeId: string) {
  return createSessionToken(secret(), SHIFT_ACCESS_MAX_AGE, `${TOKEN_PREFIX}${codeId}`);
}

/**
 * Who the cookie belongs to, or null if it's missing, forged, expired, or
 * its code has been deleted. Fails closed when misconfigured.
 */
export async function getShiftAccess(
  token: string | undefined | null,
): Promise<ShiftCodeHolder | null> {
  const prefix = token?.split(".")[0] ?? "";
  const id = prefix.slice(TOKEN_PREFIX.length);
  if (!prefix.startsWith(TOKEN_PREFIX) || !UUID_RE.test(id)) return null;

  try {
    if (!(await verifySessionToken(token, secret(), prefix))) return null;
    const { data, error } = await client()
      .from("film_shift_codes")
      .select("id, name, email")
      .eq("id", id)
      .maybeSingle<ShiftCodeHolder>();
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("shift access check failed", err);
    return null;
  }
}
