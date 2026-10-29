/**
 * Minimal signed-cookie session for the admin dashboard.
 *
 * No user table, no bcrypt, no sessions table — just an HMAC-signed token
 * so the cookie can't be forged without knowing ADMIN_SESSION_SECRET.
 * Uses Web Crypto (`crypto.subtle`) so the same code works in both the
 * Edge runtime (proxy.ts) and the Node runtime (API routes).
 */

/** Name of the httpOnly cookie holding the signed admin session. */
export const ADMIN_COOKIE_NAME = "admin_session";

/**
 * Cookie lifetime, in seconds (12 hours). Tokens are stateless, so logout
 * only clears the cookie — a copied token stays valid until it expires.
 * To revoke every session immediately, rotate ADMIN_SESSION_SECRET.
 */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

/**
 * Default payload prefix — lets verifySessionToken reject unrelated cookies.
 * Other gates (e.g. the shift board) pass their own so tokens can't cross over.
 */
const TOKEN_PREFIX = "admin";

/** Defensive upper bound on incoming token length. */
const MAX_TOKEN_LENGTH = 512;

const encoder = new TextEncoder();

function bufferToHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Creates a `<prefix>.<expiresAtMs>.<signature>` token good for `maxAgeSeconds`. */
export async function createSessionToken(
  secret: string,
  maxAgeSeconds: number,
  prefix: string = TOKEN_PREFIX,
) {
  if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds <= 0) {
    throw new Error(
      "createSessionToken: maxAgeSeconds must be a positive number",
    );
  }
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = `${prefix}.${expiresAt}`;
  const key = await getHmacKey(secret);
  const signature = bufferToHex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );
  return `${payload}.${signature}`;
}

/** Verifies signature + expiry. Returns false on any malformed/expired/forged token. */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  prefix: string = TOKEN_PREFIX,
): Promise<boolean> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return false;

  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);

  const parts = payload.split(".");
  if (parts.length !== 2 || parts[0] !== prefix) return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const key = await getHmacKey(secret);
  const expectedSignature = bufferToHex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );

  return timingSafeEqualHex(signature, expectedSignature);
}
