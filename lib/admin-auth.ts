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
  console.log("Expires at:", expiresAt);
  console.log("Current time:", Date.now());
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    console.log("❌ Token expired or invalid");
    return false;
  }

  console.log("✅ Payload valid, verifying signature...");
  const key = await getHmacKey(secret);
  const expectedSignature = bufferToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  console.log("Expected signature:", expectedSignature.substring(0, 20) + "...");
  console.log("Actual signature:", signature.substring(0, 20) + "...");

  const isValid = timingSafeEqualHex(signature, expectedSignature);
  console.log("Signature valid:", isValid);
  return isValid;
}