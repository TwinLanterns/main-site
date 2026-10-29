/**
 * Shared access code for the filming shift board (/shifts).
 *
 * Filmers enter SHIFTS_ACCESS_CODE once; we hand back an HMAC-signed cookie
 * (same token format as the admin session, different prefix). The signing
 * key mixes in the code itself, so changing SHIFTS_ACCESS_CODE locks out
 * everyone who unlocked the board with the old one.
 */

import { createSessionToken, verifySessionToken } from "@/lib/admin-auth";

/** Name of the httpOnly cookie that unlocks the shift board. */
export const SHIFT_ACCESS_COOKIE = "shift_access";

/** Cookie lifetime, in seconds (30 days). */
export const SHIFT_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

const TOKEN_PREFIX = "shifts";

/** Codes are typed by hand, so ignore case and surrounding spaces. */
export function normalizeShiftCode(code: string) {
  return code.trim().toLowerCase();
}

/** Null when SHIFTS_ACCESS_CODE or ADMIN_SESSION_SECRET is missing. */
function signingKey() {
  const code = process.env.SHIFTS_ACCESS_CODE;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!code || !secret) return null;
  return `${secret}:shifts:${normalizeShiftCode(code)}`;
}

export function shiftAccessConfigured() {
  return signingKey() !== null;
}

export async function createShiftAccessToken() {
  const key = signingKey();
  if (!key) throw new Error("SHIFTS_ACCESS_CODE / ADMIN_SESSION_SECRET not set");
  return createSessionToken(key, SHIFT_ACCESS_MAX_AGE, TOKEN_PREFIX);
}

/** False when unconfigured, so the board fails closed. */
export async function hasShiftAccess(token: string | undefined | null) {
  const key = signingKey();
  if (!key) return false;
  return verifySessionToken(token, key, TOKEN_PREFIX);
}
