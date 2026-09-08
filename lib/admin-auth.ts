/**
 * Minimal signed-cookie session for the admin dashboard.
 *
 * No user table, no bcrypt, no sessions table — just an HMAC-signed token
 * so the cookie can't be forged without knowing ADMIN_SESSION_SECRET.
 * Uses Web Crypto (`crypto.subtle`) so the same code works in both the
 * Edge runtime (middleware.ts) and the Node runtime (API routes).
 */

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

/** Creates a `payload.expiresAtMs.signature` token good for `maxAgeSeconds`. */
export async function createSessionToken(secret: string, maxAgeSeconds: number) {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = `admin.${expiresAt}`;
  const key = await getHmacKey(secret);
  const signature = bufferToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return `${payload}.${signature}`;
}

/** Verifies signature + expiry. Returns false on any malformed/expired/forged token. */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
): Promise<boolean> {
  console.log("=== VERIFY SESSION TOKEN ===");
  console.log("Token provided:", !!token);
  
  if (!token) {
    console.log("❌ No token provided");
    return false;
  }

  console.log("Token length:", token.length);
  console.log("Token preview:", token.substring(0, 50) + "...");

  const lastDot = token.lastIndexOf(".");
  console.log("Last dot position:", lastDot);
  if (lastDot === -1) {
    console.log("❌ No dot found");
    return false;
  }

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  console.log("Payload:", payload);
  console.log("Signature length:", signature.length);

  const parts = payload.split(".");
  console.log("Parts length:", parts.length);
  if (parts.length !== 2 || parts[0] !== "admin") {
    console.log("❌ Invalid payload format. Parts:", parts);
    return false;
  }

  const expiresAt = Number(parts[1]);
  console.log("Expires at:", new Date(expiresAt).toISOString());
  console.log("Current time:", new Date().toISOString());
  console.log("Time until expiry (ms):", expiresAt - Date.now());
  
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    console.log("❌ Token expired or invalid");
    return false;
  }

  console.log("✅ Payload valid, verifying signature...");
  const key = await getHmacKey(secret);
  const expectedSignature = bufferToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  
  console.log("Expected signature (first 20 chars):", expectedSignature.substring(0, 20) + "...");
  console.log("Actual signature (first 20 chars):", signature.substring(0, 20) + "...");
  console.log("Signatures match:", expectedSignature === signature);

  const isValid = timingSafeEqualHex(signature, expectedSignature);
  console.log("✅ Signature valid:", isValid);
  return isValid;
}