// lib/submissions/partner-persistence.ts
//
// Mirrors the error-handling shape of lib/submissions/persistence.ts
// (PartnerConfigError → 500, PartnerSaveError → 502) so app/api/partner/*
// routes can stay thin orchestrators, same as app/api/submit/route.ts.

import { NextResponse } from "next/server";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";
import {
  evaluatePartnerEligibility,
  evaluatePartnerGoproEligibility,
} from "./partner-eligibility";
import type {
  PartnerApplicantPayload,
  PartnerAmbassadorPayload,
  PartnerGoproPayload,
} from "./partner-types";

export class PartnerConfigError extends Error {}
export class PartnerSaveError extends Error {}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export interface SavePartnerApplicantResult {
  id: string;
  table: "partner_applicants_qualified" | "partner_applicants_unqualified";
  qualified: boolean;
  reasons: string[];
}

function toPartnerConfigError(err: unknown): PartnerConfigError {
  return new PartnerConfigError(
    err instanceof Error ? err.message : "Supabase not configured",
  );
}

export async function savePartnerApplicant(
  payload: PartnerApplicantPayload,
): Promise<SavePartnerApplicantResult> {
  const supabase = getSupabaseOrThrow(toPartnerConfigError);

  const { qualified, reasons } = evaluatePartnerEligibility({
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
    ? "partner_applicants_qualified"
    : "partner_applicants_unqualified";

  const row = qualified ? shared : { ...shared, disqualified_reasons: reasons };

  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select("id")
    .single();

    if (error || !data) {
        console.error(`supabase insert error (${table})`, error);
        throw new PartnerSaveError(error?.message ?? `Insert into ${table} failed`);
    }

  return { id: data.id as string, table, qualified, reasons };
}

export interface SavePartnerGoproResult {
  id: string;
  qualified: boolean;
  reasons: string[];
}

export async function savePartnerGoproApplicant(
  payload: PartnerGoproPayload,
): Promise<SavePartnerGoproResult> {
  const supabase = getSupabaseOrThrow(toPartnerConfigError);

  const { qualified, reasons } = evaluatePartnerGoproEligibility(payload);

  const { data, error } = await supabase
    .from("partner_gopro_applicants")
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
    console.error("supabase insert error (partner_gopro_applicants)", error);
    throw new PartnerSaveError(
      error?.message ?? "Insert into partner_gopro_applicants failed",
    );
  }

  return { id: data.id as string, qualified, reasons };
}

export interface SavePartnerAmbassadorResult {
  id: string;
  code: string;
}

export async function savePartnerAmbassador(
  payload: PartnerAmbassadorPayload,
): Promise<SavePartnerAmbassadorResult> {
  const supabase = getSupabaseOrThrow(toPartnerConfigError);

  // Retry on the rare code collision (unique constraint on `code`).
  const MAX_ATTEMPTS = 5;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from("partner_ambassadors")
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
        throw new PartnerSaveError(error?.message ?? "Insert failed");
    }
    if ((error as { constraint?: string })?.constraint === "partner_ambassadors_email_key") {
        throw new PartnerSaveError("You're already an ambassador");
    }
    lastError = error?.message;
  }

  throw new PartnerSaveError(
    lastError ?? "Could not generate a unique referral code — try again",
  );
}

// Shared by app/api/partner/submit and app/api/partner/refer for the catch-all
// at the bottom of their POST handlers. `exposeDevMessage` mirrors what
// app/api/partner/submit did before this was extracted — it isn't set for
// app/api/partner/refer.
export function partnerErrorResponse(
  err: unknown,
  opts: { exposeDevMessage?: boolean } = {},
): NextResponse {
  const dev = opts.exposeDevMessage && process.env.NODE_ENV === "development";

  if (err instanceof PartnerConfigError) {
    return NextResponse.json(
      { ok: false, error: dev ? err.message : "Server misconfigured" },
      { status: 500 },
    );
  }
  if (err instanceof PartnerSaveError) {
    return NextResponse.json(
      { ok: false, error: dev ? err.message : "Save failed" },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: false, error: "Save failed" }, { status: 502 });
}