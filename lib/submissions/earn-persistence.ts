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
// screen on: every sign-up is saved as qualified.
export interface SaveEarnSignupResult {
  id: string;
  qualified: boolean;
  reasons: string[];
}

function toEarnConfigError(err: unknown): EarnConfigError {
  return new EarnConfigError(
    err instanceof Error ? err.message : "Supabase not configured",
  );
}

async function insertSignup(
  table: string,
  payload: EarnSignupPayload,
  extra: Record<string, unknown>,
): Promise<SaveEarnSignupResult> {
  const supabase = getSupabaseOrThrow(toEarnConfigError);

  const { data, error } = await supabase
    .from(table)
    .insert({
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      referred_by_code: payload.referredByCode || null,
      raw_payload: payload,
      ...extra,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`supabase insert error (${table})`, error);
    throw new EarnSaveError(error?.message ?? `Insert into ${table} failed`);
  }

  return { id: data.id as string, qualified: true, reasons: [] };
}

export function saveEarnApplicant(
  payload: EarnSignupPayload,
): Promise<SaveEarnSignupResult> {
  return insertSignup("earn_applicants_qualified", payload, {
    task_interests: [],
    filming_ack: false,
    consent: false,
  });
}

export function saveEarnGoproApplicant(
  payload: EarnSignupPayload,
): Promise<SaveEarnSignupResult> {
  return insertSignup("earn_gopro_applicants", payload, { qualified: true });
}

export function saveEarnSpeechParticipant(
  payload: EarnSignupPayload,
): Promise<SaveEarnSignupResult> {
  return insertSignup("earn_speech_participants", payload, { qualified: true });
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