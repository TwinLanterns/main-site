// lib/submissions/earn-persistence.ts
//
// Mirrors the error-handling shape of lib/submissions/persistence.ts
// (EarnConfigError → 500, EarnSaveError → 502) so app/api/earn/*
// routes can stay thin orchestrators, same as app/api/submit/route.ts.

import { NextResponse } from "next/server";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";
import {
  evaluateEarnEligibility,
  evaluateEarnGoproEligibility,
  evaluateEarnSpeechEligibility,
} from "./earn-eligibility";
import type {
  EarnApplicantPayload,
  EarnAmbassadorPayload,
  EarnGoproPayload,
  EarnSpeechPayload,
} from "./earn-types";

export class EarnConfigError extends Error {}
export class EarnSaveError extends Error {}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export interface SaveEarnApplicantResult {
  id: string;
  table: "earn_applicants_qualified" | "earn_applicants_unqualified";
  qualified: boolean;
  reasons: string[];
}

function toEarnConfigError(err: unknown): EarnConfigError {
  return new EarnConfigError(
    err instanceof Error ? err.message : "Supabase not configured",
  );
}

export async function saveEarnApplicant(
  payload: EarnApplicantPayload,
): Promise<SaveEarnApplicantResult> {
  const supabase = getSupabaseOrThrow(toEarnConfigError);

  const { qualified, reasons } = evaluateEarnEligibility({
    deviceOs: payload.deviceOs,
    deviceModel: payload.deviceModel,
    filmingAck: payload.filmingAck,
    consent: payload.consent,
  });

  const shared = {
    first_name: payload.firstName,
    last_name: payload.lastName ?? null,
    email: payload.email,
    phone: payload.phone ?? null,
    location: payload.location ?? null,
    device_os: payload.deviceOs || null,
    referred_by: payload.referredBy ?? null,
    referrer_college: payload.referrerCollege ?? null,
    device_model: payload.deviceModel || null,
    task_interests: payload.taskInterests,
    filming_ack: payload.filmingAck,
    consent: payload.consent,
    referred_by_code: payload.referredByCode || null,
    raw_payload: payload,
  };

  const table = qualified
    ? "earn_applicants_qualified"
    : "earn_applicants_unqualified";

  const row = qualified ? shared : { ...shared, disqualified_reasons: reasons };

  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select("id")
    .single();

    if (error || !data) {
        console.error(`supabase insert error (${table})`, error);
        throw new EarnSaveError(error?.message ?? `Insert into ${table} failed`);
    }

  return { id: data.id as string, table, qualified, reasons };
}

export interface SaveEarnGoproResult {
  id: string;
  qualified: boolean;
  reasons: string[];
}

export async function saveEarnGoproApplicant(
  payload: EarnGoproPayload,
): Promise<SaveEarnGoproResult> {
  const supabase = getSupabaseOrThrow(toEarnConfigError);

  const { qualified, reasons } = evaluateEarnGoproEligibility(payload);

  const { data, error } = await supabase
    .from("earn_gopro_applicants")
    .insert({
      first_name: payload.firstName,
      last_name: payload.lastName ?? null,
      email: payload.email,
      phone: payload.phone ?? null,
      location: payload.location ?? null,
      qualified,
      disqualified_reasons: qualified ? null : reasons,
      is_adult: payload.isAdult,
      has_core_areas: payload.hasCoreAreas,
      can_keep_others_out: payload.canKeepOthersOut,
      weekly_hours_ok: payload.weeklyHoursOk,
      consent: payload.consent,
      referred_by: payload.referredBy ?? null,
      referrer_college: payload.referrerCollege ?? null,
      referred_by_code: payload.referredByCode || null,
      raw_payload: payload,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("supabase insert error (earn_gopro_applicants)", error);
    throw new EarnSaveError(
      error?.message ?? "Insert into earn_gopro_applicants failed",
    );
  }

  return { id: data.id as string, qualified, reasons };
}

export interface SaveEarnSpeechResult {
  id: string;
  qualified: boolean;
  reasons: string[];
}

export async function saveEarnSpeechParticipant(
  payload: EarnSpeechPayload,
): Promise<SaveEarnSpeechResult> {
  const supabase = getSupabaseOrThrow(toEarnConfigError);

  const { qualified, reasons } = evaluateEarnSpeechEligibility(payload);

  const { data, error } = await supabase
    .from("earn_speech_participants")
    .insert({
      first_name: payload.firstName,
      last_name: payload.lastName ?? null,
      email: payload.email,
      phone: payload.phone ?? null,
      qualified,
      disqualified_reasons: qualified ? null : reasons,
      age: payload.age,
      sex: payload.sex || null,
      race_ethnicity: payload.raceEthnicity || null,
      accent: payload.accent || null,
      region: payload.region ?? null,
      first_language_english: payload.firstLanguageEnglish,
      guardian_consent: payload.guardianConsent,
      availability_ok: payload.availabilityOk,
      consent: payload.consent,
      referred_by: payload.referredBy ?? null,
      referrer_college: payload.referrerCollege ?? null,
      referred_by_code: payload.referredByCode || null,
      raw_payload: payload,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("supabase insert error (earn_speech_participants)", error);
    throw new EarnSaveError(
      error?.message ?? "Insert into earn_speech_participants failed",
    );
  }

  return { id: data.id as string, qualified, reasons };
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
    if ((error as { code?: string })?.code !== "23505") {
        throw new EarnSaveError(error?.message ?? "Insert failed");
    }
    if ((error as { constraint?: string })?.constraint === "earn_ambassadors_email_key") {
        throw new EarnSaveError("You're already an ambassador");
    }
    lastError = error?.message;
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
  opts: { exposeDevMessage?: boolean } = {},
): NextResponse {
  const dev = opts.exposeDevMessage && process.env.NODE_ENV === "development";

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