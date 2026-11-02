// lib/ops/team-token.ts
//
// Session token for per-person /ops logins. Same HMAC format as the admin
// cookie (lib/admin-auth.ts) with a `team_<member id>` prefix, so a team
// token can't pass as an admin or shift-board token. No database access
// here — proxy.ts imports it; lib/ops/auth.ts re-checks the member row.

import { createSessionToken, verifySessionToken } from "@/lib/admin-auth";

export const OPS_COOKIE_NAME = "ops_session";

/** 12 hours, like the admin session. Deactivating a member locks them out at once. */
export const OPS_SESSION_MAX_AGE = 60 * 60 * 12;

const PREFIX = "team_";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createTeamToken(secret: string, memberId: string) {
  return createSessionToken(secret, OPS_SESSION_MAX_AGE, `${PREFIX}${memberId}`);
}

/** The member id a valid token names, or null. */
export async function verifyTeamToken(token: string | undefined | null, secret: string) {
  const prefix = token?.split(".")[0] ?? "";
  const id = prefix.slice(PREFIX.length);
  if (!prefix.startsWith(PREFIX) || !UUID_RE.test(id)) return null;
  return (await verifySessionToken(token, secret, prefix)) ? id : null;
}
