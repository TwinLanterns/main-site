// lib/ops/google-sso.ts
//
// "Sign in with Google" for /ops (OpenID Connect authorization code flow +
// PKCE). Google only proves who someone is: the callback still requires an
// existing, active team_members row with that email, so a Google login
// never creates an account. Pure helpers here; the routes live in
// app/api/ops/auth/google/*.
//
// The ID token arrives straight from Google's token endpoint over TLS in
// exchange for our client secret, so per OIDC Core §3.1.3.7 its claims are
// checked (iss, aud, exp, nonce, email_verified) without fetching Google's
// signing keys.

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALLBACK_PATH = "/api/ops/auth/google/callback";

/** Short-lived cookie holding state, nonce and PKCE verifier between redirects. */
export const GOOGLE_FLOW_COOKIE = "ops_google_flow";
export const GOOGLE_FLOW_MAX_AGE = 10 * 60;

const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_SSO_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_SSO_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export interface FlowState {
  state: string;
  nonce: string;
  verifier: string;
  from: string;
}

function base64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** Only same-site /ops paths; anything else falls back to /ops. */
export function safeOpsPath(from: unknown): string {
  return typeof from === "string" && /^\/ops(\/|$)/.test(from) && !from.startsWith("//") && !from.includes("\\") ? from : "/ops";
}

export function encodeFlow(f: FlowState) {
  return JSON.stringify(f);
}

export function decodeFlow(raw: string | undefined): FlowState | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const v = JSON.parse(raw);
    if ([v?.state, v?.nonce, v?.verifier, v?.from].every((x) => typeof x === "string" && x)) return v as FlowState;
  } catch {}
  return null;
}

export function authorizationUrl(cfg: GoogleConfig, redirectUri: string, flow: FlowState, challenge: string) {
  const u = new URL(GOOGLE_AUTH_URL);
  u.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return u.toString();
}

/** Constant-time string comparison. */
export function sameString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = new TextDecoder().decode(Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")), (c) => c.charCodeAt(0)));
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

export type IdTokenResult = { ok: true; email: string } | { ok: false; reason: string };

/** Checks an ID token received directly from Google's token endpoint. */
export function checkIdToken(idToken: string, clientId: string, nonce: string, nowMs = Date.now()): IdTokenResult {
  const c = decodeJwtPayload(idToken);
  if (!c) return { ok: false, reason: "malformed" };
  if (typeof c.iss !== "string" || !ISSUERS.includes(c.iss)) return { ok: false, reason: "issuer" };
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(clientId)) return { ok: false, reason: "audience" };
  if (typeof c.exp !== "number" || c.exp * 1000 < nowMs - 60_000) return { ok: false, reason: "expired" };
  if (typeof c.nonce !== "string" || !sameString(c.nonce, nonce)) return { ok: false, reason: "nonce" };
  if (c.email_verified !== true && c.email_verified !== "true") return { ok: false, reason: "unverified" };
  if (typeof c.email !== "string" || !c.email.includes("@")) return { ok: false, reason: "email" };
  return { ok: true, email: c.email.trim().toLowerCase() };
}

/** Messages for /ops/login?error=<code>. */
export const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up on this server.",
  google_cancelled: "Google sign-in was cancelled.",
  google_expired: "That sign-in attempt expired. Try again.",
  google_failed: "Google sign-in failed. Try again, or use your password.",
  google_no_account: "No active team account uses that Google email. Ask leadership to add it in Project settings.",
};
