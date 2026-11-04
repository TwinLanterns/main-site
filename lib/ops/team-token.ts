// lib/ops/team-token.ts
//
// Session token for per-person /ops logins. Same HMAC format as the admin
// cookie (lib/admin-auth.ts) with a `team_<member id>_<stamp>` prefix, so a
// team token can't pass as an admin or shift-board token. The stamp is
// derived from the member's current password hash, so resetting a password
// ends every session issued before it. No database access here — proxy.ts
// imports it; lib/ops/auth.ts re-checks the member row and the stamp.

import { createSessionToken, verifySessionToken } from "@/lib/admin-auth";

export const OPS_COOKIE_NAME = "ops_session";

/** 12 hours, like the admin session. Deactivating a member locks them out at once. */
export const OPS_SESSION_MAX_AGE = 60 * 60 * 12;

const PREFIX = "team_";
const PREFIX_RE = /^team_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_([0-9a-f]{16})$/i;

/** Short, non-secret fingerprint of a password hash (first 8 bytes of SHA-256). */
export async function passwordStamp(passwordHash: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passwordHash));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createTeamToken(secret: string, memberId: string, passwordHash: string) {
  return createSessionToken(secret, OPS_SESSION_MAX_AGE, `${PREFIX}${memberId}_${await passwordStamp(passwordHash)}`);
}

/** The member id and password stamp a validly signed token names, or null. */
export async function verifyTeamToken(token: string | undefined | null, secret: string) {
  const prefix = token?.split(".")[0] ?? "";
  const m = PREFIX_RE.exec(prefix);
  if (!m) return null;
  return (await verifySessionToken(token, secret, prefix)) ? { memberId: m[1], stamp: m[2] } : null;
}

/** Cookie options for the ops_session cookie (password and Google sign-in). */
export const OPS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: OPS_SESSION_MAX_AGE,
} as const;
