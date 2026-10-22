// lib/verification/store.ts
//
// Backs the inline 6-digit OTP flow: a code is emailed, the wizard collects
// it, and the submission routes (app/api/submit, app/api/earn/*) refuse to
// save until `assertEmailVerified` confirms it. Keyed on (email, purpose) —
// there's one row per address per funnel, upserted on resend.

import { createHash, randomInt, timingSafeEqual } from "crypto";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";
import { sendVerificationCodeEmail } from "@/lib/email/verification-emails";
import type { VerificationPurpose } from "./types";

export class VerificationConfigError extends Error {
  constructor(message = "Supabase misconfigured") {
    super(message);
    this.name = "VerificationConfigError";
  }
}

// Anything the client should see as a plain message: cooldowns, bad/expired
// codes, too many attempts. `status` lets the route pick 400 vs 429.
export class VerificationRequestError extends Error {
  status: 400 | 429;
  constructor(message: string, status: 400 | 429 = 400) {
    super(message);
    this.name = "VerificationRequestError";
    this.status = status;
  }
}

export class VerificationRequiredError extends Error {
  constructor(message = "Please verify your email before submitting.") {
    super(message);
    this.name = "VerificationRequiredError";
  }
}

const CODE_TTL_MS = 10 * 60 * 1000;
// How long a confirmed address stays usable for a submission.
const VERIFIED_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

// Codes are stored hashed so a database read doesn't hand out live codes.
function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function codesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function client() {
  return getSupabaseOrThrow(
    (err) =>
      new VerificationConfigError(
        err instanceof Error ? err.message : "Supabase not configured",
      ),
  );
}

export async function issueVerificationCode(
  rawEmail: string,
  purpose: VerificationPurpose,
): Promise<void> {
  const supabase = client();
  const email = normalize(rawEmail);

  const { data: existing, error: fetchError } = await supabase
    .from("email_verifications")
    .select("created_at, verified, expires_at")
    .eq("email", email)
    .eq("purpose", purpose)
    .maybeSingle();

  if (fetchError) {
    console.error("verification lookup error", fetchError);
    throw new VerificationRequestError("Could not send a code — try again.");
  }

  if (
    existing &&
    Date.now() - new Date(existing.created_at).getTime() < RESEND_COOLDOWN_MS
  ) {
    throw new VerificationRequestError(
      "Give it a few seconds before requesting another code.",
      429,
    );
  }

  const code = generateCode();

  // Anyone can request a code for any address, so a request must not undo
  // a live verification the owner already completed (they may be about to
  // submit). The new code is still sent, so an owner who lost their page
  // state can re-confirm.
  const existingExpiry = existing ? new Date(existing.expires_at).getTime() : 0;
  const keepVerified = Boolean(existing?.verified) && existingExpiry > Date.now();

  const { error } = await supabase.from("email_verifications").upsert(
    {
      email,
      purpose,
      code: hashCode(code),
      attempts: 0,
      verified: keepVerified,
      expires_at: new Date(
        Math.max(existingExpiry, Date.now() + CODE_TTL_MS),
      ).toISOString(),
      created_at: new Date().toISOString(),
    },
    { onConflict: "email,purpose" },
  );

  if (error) {
    console.error("verification upsert error", error);
    throw new VerificationRequestError("Could not send a code — try again.");
  }

  await sendVerificationCodeEmail(rawEmail.trim(), code);
}

export async function confirmVerificationCode(
  rawEmail: string,
  purpose: VerificationPurpose,
  rawCode: string,
): Promise<void> {
  const supabase = client();
  const email = normalize(rawEmail);
  const code = rawCode.trim();

  const { data, error } = await supabase
    .from("email_verifications")
    .select("id, code, attempts, verified, expires_at")
    .eq("email", email)
    .eq("purpose", purpose)
    .maybeSingle();

  if (error) {
    console.error("verification lookup error", error);
    throw new VerificationRequestError(
      "Could not confirm that code — try again.",
    );
  }

  if (!data) {
    throw new VerificationRequestError("Request a code before trying to verify.");
  }

  // No early return for already-verified rows: the code must still match,
  // otherwise anyone could "confirm" an address its owner verified.
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new VerificationRequestError("That code expired — send a new one.");
  }

  if (data.attempts >= MAX_ATTEMPTS) {
    throw new VerificationRequestError("Too many attempts — send a new code.");
  }

  // Claim an attempt slot atomically (compare-and-swap on `attempts`) before
  // checking the code, so parallel guesses can't all slip under MAX_ATTEMPTS.
  const { data: claimed, error: claimError } = await supabase
    .from("email_verifications")
    .update({ attempts: data.attempts + 1 })
    .eq("id", data.id)
    .eq("attempts", data.attempts)
    .select("id");

  if (claimError) {
    console.error("verification attempt error", claimError);
    throw new VerificationRequestError(
      "Could not confirm that code — try again.",
    );
  }

  if (!claimed || claimed.length === 0) {
    throw new VerificationRequestError(
      "Too many simultaneous attempts — try again.",
      429,
    );
  }

  if (!codesMatch(data.code, hashCode(code))) {
    throw new VerificationRequestError("That code doesn't match.");
  }

  const { error: updateError } = await supabase
    .from("email_verifications")
    .update({
      verified: true,
      expires_at: new Date(Date.now() + VERIFIED_TTL_MS).toISOString(),
    })
    .eq("id", data.id);

  if (updateError) {
    console.error("verification confirm error", updateError);
    throw new VerificationRequestError(
      "Could not confirm that code — try again.",
    );
  }
}

// A confirmed address is good for VERIFIED_TTL_MS (expires_at is pushed out
// on confirm), or until consumeVerification() clears it on a successful
// submit — an abandoned verification can't be reused indefinitely.
export async function assertEmailVerified(
  rawEmail: string,
  purpose: VerificationPurpose,
): Promise<void> {
  const supabase = client();
  const email = normalize(rawEmail);

  const { data, error } = await supabase
    .from("email_verifications")
    .select("verified, expires_at")
    .eq("email", email)
    .eq("purpose", purpose)
    .maybeSingle();

  if (error) {
    console.error("verification check error", error);
    throw new VerificationRequiredError();
  }

  if (!data?.verified || new Date(data.expires_at).getTime() < Date.now()) {
    throw new VerificationRequiredError();
  }
}

export async function consumeVerification(
  rawEmail: string,
  purpose: VerificationPurpose,
): Promise<void> {
  const supabase = client();
  const email = normalize(rawEmail);

  const { error } = await supabase
    .from("email_verifications")
    .delete()
    .eq("email", email)
    .eq("purpose", purpose);

  if (error) {
    console.error("verification cleanup error", error);
  }
}
