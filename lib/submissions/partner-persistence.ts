// lib/submissions/partner-persistence.ts
//
// Mirrors the error-handling shape of lib/submissions/persistence.ts
// (PartnerConfigError → 500, PartnerSaveError → 502) so app/api/partner/*
// routes can stay thin orchestrators, same as app/api/submit/route.ts.

import { getSupabaseServerClient } from "@/lib/supabase-server";
import { evaluatePartnerEligibility } from "./partner-eligibility";
import type { PartnerApplicantPayload, PartnerAmbassadorPayload } from "./partner-types";

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

export async function savePartnerApplicant(
  payload: PartnerApplicantPayload,
): Promise<SavePartnerApplicantResult> {
  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (err) {
    throw new PartnerConfigError(
      err instanceof Error ? err.message : "Supabase not configured",
    );
  }

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

export interface SavePartnerAmbassadorResult {
  id: string;
  code: string;
}

export async function savePartnerAmbassador(
  payload: PartnerAmbassadorPayload,
): Promise<SavePartnerAmbassadorResult> {
  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (err) {
    throw new PartnerConfigError(
      err instanceof Error ? err.message : "Supabase not configured",
    );
  }

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