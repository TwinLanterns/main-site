// lib/submissions/earn-persistence.ts
//
// Mirrors the error-handling shape of lib/submissions/persistence.ts
// (EarnConfigError → 500, EarnSaveError → 502) so app/api/earn/*
// routes can stay thin orchestrators, same as app/api/submit/route.ts.

import { NextResponse } from "next/server";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";
import type { EarnSignupPayload, EarnAmbassadorPayload } from "./earn-types";

export class EarnConfigError extends Error {}
export class EarnSaveError extends Error {}
// Unique email violation (23505) — someone with this email already signed up.
export class EarnDuplicateError extends Error {}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// The sign-up forms only collect contact details, so there's nothing to
// screen on: every sign-up is saved as qualified. Screening/consent columns
// left over from the old forms are written as NULL ("not asked"), never
// false ("said no") — see supabase/earn_consent_columns.sql.
export interface SaveEarnSignupResult {
  id: string;
  qualified: boolean;
  reasons: string[];
  /** The referral code actually credited (null if missing or invalid). */
  referredByCode: string | null;
}

function toEarnConfigError(err: unknown): EarnConfigError {
  return new EarnConfigError(
    err instanceof Error ? err.message : "Supabase not configured",
  );
}

// Referral codes come from the URL/localStorage, so only credit ones that
// belong to a real ambassador — and never the applicant themselves.
async function resolveReferralCode(
  supabase: ReturnType<typeof getSupabaseOrThrow>,
  rawCode: string | null,
  applicantEmail: string,
): Promise<string | null> {
  const code = rawCode?.trim().toUpperCase();
  if (!code || code.length > 32) return null;

  const { data, error } = await supabase
    .from("earn_ambassadors")
    .select("code, email")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("referral code lookup failed", error);
    return null;
  }
  if (!data) return null;
  if (
    String(data.email).trim().toLowerCase() ===
    applicantEmail.trim().toLowerCase()
  ) {
    return null;
  }
  return data.code as string;
}

async function insertSignup(
  table: string,
  payload: EarnSignupPayload,
  extra: Record<string, unknown>,
): Promise<SaveEarnSignupResult> {
  const supabase = getSupabaseOrThrow(toEarnConfigError);
  const referredByCode = await resolveReferralCode(
    supabase,
    payload.referredByCode,
    payload.email,
  );

  const { data, error } = await supabase
    .from(table)
    .insert({
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      referred_by: payload.referredBy ?? null,
      referrer_college: payload.referrerCollege ?? null,
      referred_by_code: referredByCode,
      terms_accepted_at: payload.acceptedTermsAt,
      terms_version: payload.termsVersion,
      raw_payload: { ...payload, referredByCode },
      ...extra,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`supabase insert error (${table})`, error);
    if (error?.code === "23505") throw new EarnDuplicateError(error.message);
    throw new EarnSaveError(error?.message ?? `Insert into ${table} failed`);
  }

  return { id: data.id as string, qualified: true, reasons: [], referredByCode };
}

export function saveEarnApplicant(
  payload: EarnSignupPayload,
): Promise<SaveEarnSignupResult> {
  return insertSignup("earn_applicants_qualified", payload, {
    device_os: null,
    device_model: null,
    task_interests: null,
    filming_ack: null,
    consent: null,
  });
}

export function saveEarnGoproApplicant(
  payload: EarnSignupPayload,
): Promise<SaveEarnSignupResult> {
  return insertSignup("earn_gopro_applicants", payload, {
    qualified: true,
    is_adult: null,
    has_core_areas: null,
    can_keep_others_out: null,
    weekly_hours_ok: null,
    consent: null,
  });
}

export function saveEarnSpeechParticipant(
  payload: EarnSignupPayload,
): Promise<SaveEarnSignupResult> {
  return insertSignup("earn_speech_participants", payload, {
    qualified: true,
    first_language_english: null,
    guardian_consent: null,
    availability_ok: null,
    consent: null,
  });
}

export interface SaveEarnAmbassadorResult {
  id: string;
  code: string;
}

export async function saveEarnAmbassador(
  payload: EarnAmbassadorPayload,
): Promise<SaveEarnAmbassadorResult> {
  const supabase = getSupabaseOrThrow(toEarnConfigError);

  // Retry on the rare code collision (unique constraint on `code`).
  const MAX_ATTEMPTS = 5;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from("earn_ambassadors")
      .insert({
        name: payload.name,
        email: payload.email,
        code,
        raw_payload: payload,
      })
      .select("id, code")
      .single();

    if (!error && data) {
      return { id: data.id as string, code: data.code as string };
    }

    // 23505 = unique_violation in Postgres; anything else, bail immediately.
    if (error?.code !== "23505") {
      throw new EarnSaveError(error?.message ?? "Insert failed");
    }
    // PostgrestError has no `constraint` field — the violated constraint is
    // only named in the message. Only a `code` collision is worth retrying.
    if (!/_code_|\(code\)/.test(`${error.message} ${error.details ?? ""}`)) {
      throw new EarnDuplicateError(error.message);
    }
    lastError = error.message;
  }

  throw new EarnSaveError(
    lastError ?? "Could not generate a unique referral code — try again",
  );
}

// Shared by app/api/earn/submit and app/api/earn/refer for the catch-all
// at the bottom of their POST handlers. `exposeDevMessage` mirrors what
// app/api/earn/submit did before this was extracted — it isn't set for
// app/api/earn/refer.
export function earnErrorResponse(
  err: unknown,
  opts: { exposeDevMessage?: boolean; duplicateMessage?: string } = {},
): NextResponse {
  const dev = opts.exposeDevMessage && process.env.NODE_ENV === "development";

  if (err instanceof EarnDuplicateError) {
    return NextResponse.json(
      {
        ok: false,
        error: opts.duplicateMessage ?? "You've already signed up with this email.",
      },
      { status: 409 },
    );
  }

  if (err instanceof EarnConfigError) {
    return NextResponse.json(
      { ok: false, error: dev ? err.message : "Server misconfigured" },
      { status: 500 },
    );
  }
  if (err instanceof EarnSaveError) {
    return NextResponse.json(
      { ok: false, error: dev ? err.message : "Save failed" },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: false, error: "Save failed" }, { status: 502 });
}