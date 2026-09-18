// lib/verification/store.ts
//
// Backs the inline 6-digit OTP flow: a code is emailed, the wizard collects
// it, and the submission routes (app/api/submit, app/api/partner/*) refuse to
// save until `assertEmailVerified` confirms it. Keyed on (email, purpose) —
// there's one row per address per funnel, upserted on resend.

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
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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
    .select("created_at")
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

  const { error } = await supabase.from("email_verifications").upsert(
    {
      email,
      purpose,
      code,
      attempts: 0,
      verified: false,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
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

  if (data.verified) return;

  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new VerificationRequestError("That code expired — send a new one.");
  }

  if (data.attempts >= MAX_ATTEMPTS) {
    throw new VerificationRequestError("Too many attempts — send a new code.");
  }

  if (data.code !== code) {
    await supabase
      .from("email_verifications")
      .update({ attempts: data.attempts + 1 })
      .eq("id", data.id);
    throw new VerificationRequestError("That code doesn't match.");
  }

  const { error: updateError } = await supabase
    .from("email_verifications")
    .update({ verified: true })
    .eq("id", data.id);

  if (updateError) {
    console.error("verification confirm error", updateError);
    throw new VerificationRequestError(
      "Could not confirm that code — try again.",
    );
  }
}

// No expiry check here beyond `verified` itself — once confirmed, the proof
// holds until consumeVerification() clears it (on successful submit) or a
// fresh code overwrites it. Good enough for a marketing-site signup flow,
// not a session token.
export async function assertEmailVerified(
  rawEmail: string,
  purpose: VerificationPurpose,
): Promise<void> {
  const supabase = client();
  const email = normalize(rawEmail);

  const { data, error } = await supabase
    .from("email_verifications")
    .select("verified")
    .eq("email", email)
    .eq("purpose", purpose)
    .maybeSingle();

  if (error) {
    console.error("verification check error", error);
    throw new VerificationRequiredError();
  }

  if (!data?.verified) {
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
