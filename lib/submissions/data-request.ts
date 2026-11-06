// lib/submissions/data-request.ts
//
// Parse + persist for the buyer contact form (app/api/data-request).
// Mirrors the shape of parse.ts / persistence.ts. No email OTP here: this
// is a sales lead, so friction costs more than the occasional junk message,
// which the honeypot, validation and rate limit already filter.

import { parseJsonBody } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";

export const INQUIRY_INTERESTS = {
  managed_collection: "Managed collection",
  platform_access: "Platform access",
  both: "Both",
} as const;
export type InquiryInterest = keyof typeof INQUIRY_INTERESTS;

export interface DataRequestPayload {
  name: string;
  email: string;
  message: string;
  // Business-inquiry fields (supabase/ops_core.sql). Optional so older
  // callers and pre-migration databases keep working.
  organization?: string;
  interest?: InquiryInterest;
  environment?: string;
  geography?: string;
  timing?: string;
  volume?: string;
  volumeIsEstimate?: boolean | null;
  sourcePage?: string;
}

export type ParseDataRequestResult =
  | { ok: true; data: DataRequestPayload }
  // Honeypot filled: the route pretends success so bots don't adapt.
  | { ok: true; spam: true }
  | { ok: false; error: string };

export class DataRequestConfigError extends Error {}
export class DataRequestSaveError extends Error {}

function text(p: Record<string, unknown>, key: string, max: number): string {
  const v = p[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function parseDataRequest(
  req: Request,
): Promise<ParseDataRequestResult> {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok || typeof parsed.body !== "object" || parsed.body === null) {
    return { ok: false, error: "Invalid request" };
  }
  const p = parsed.body as Record<string, unknown>;

  // Hidden field real users never see or fill.
  if (text(p, "website", 500)) return { ok: true, spam: true };

  const name = text(p, "name", 200);
  const email = text(p, "email", 200);
  const message = text(p, "message", 5000);

  if (name.length < 2) return { ok: false, error: "Please add your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Please add a valid email." };

  const interestRaw = text(p, "interest", 40);
  if (interestRaw && !(interestRaw in INQUIRY_INTERESTS)) {
    return { ok: false, error: "Pick what you're interested in." };
  }
  const estimate = p.volumeIsEstimate;

  return {
    ok: true,
    data: {
      name,
      email,
      message,
      organization: text(p, "organization", 200),
      interest: (interestRaw || undefined) as InquiryInterest | undefined,
      environment: text(p, "environment", 200),
      geography: text(p, "geography", 200),
      timing: text(p, "timing", 200),
      volume: text(p, "volume", 200),
      volumeIsEstimate: typeof estimate === "boolean" ? estimate : null,
      sourcePage: text(p, "sourcePage", 200),
    },
  };
}

export async function saveDataRequest(payload: DataRequestPayload): Promise<void> {
  const supabase = getSupabaseOrThrow(
    (err) =>
      new DataRequestConfigError(
        err instanceof Error ? err.message : "Supabase not configured",
      ),
  );

  const base = { name: payload.name, email: payload.email, message: payload.message };
  let { error } = await supabase.from("data_requests").insert({
    ...base,
    organization: payload.organization || null,
    interest: payload.interest ?? null,
    environment: payload.environment || null,
    geography: payload.geography || null,
    timing: payload.timing || null,
    volume: payload.volume || null,
    volume_is_estimate: payload.volumeIsEstimate ?? null,
    source_page: payload.sourcePage || null,
  });

  // Columns not added yet (ops_core.sql not run): keep the inquiry by
  // folding the extra answers into the message rather than losing it.
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    console.error("data_requests missing inquiry columns — saving into message", error.message);
    const extra = inquiryDetails(payload)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    ({ error } = await supabase.from("data_requests").insert({ ...base, message: extra ? `${base.message}\n\n${extra}` : base.message }));
  }

  if (error) {
    console.error("supabase insert error (data_requests)", error);
    throw new DataRequestSaveError(error.message);
  }
}

/** Label/value pairs for the optional inquiry fields that were filled in. */
export function inquiryDetails(p: DataRequestPayload): [string, string][] {
  const rows: [string, string | undefined][] = [
    ["Organization", p.organization],
    ["Interest", p.interest ? INQUIRY_INTERESTS[p.interest] : undefined],
    ["Collection environment", p.environment],
    ["Geography", p.geography],
    ["Timing", p.timing],
    ["Volume", p.volume ? `${p.volume}${p.volumeIsEstimate ? " (estimate)" : p.volumeIsEstimate === false ? " (firm)" : ""}` : undefined],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}
