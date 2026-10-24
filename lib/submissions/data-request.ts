// lib/submissions/data-request.ts
//
// Parse + persist for the buyer contact form (app/api/data-request).
// Mirrors the shape of parse.ts / persistence.ts. No email OTP here: this
// is a sales lead, so friction costs more than the occasional junk message,
// which the honeypot, validation and rate limit already filter.

import { parseJsonBody } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";

export interface DataRequestPayload {
  name: string;
  email: string;
  message: string;
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
  if (message.length < 2) return { ok: false, error: "Please write a message." };

  return { ok: true, data: { name, email, message } };
}

export async function saveDataRequest(payload: DataRequestPayload): Promise<void> {
  const supabase = getSupabaseOrThrow(
    (err) =>
      new DataRequestConfigError(
        err instanceof Error ? err.message : "Supabase not configured",
      ),
  );

  const { error } = await supabase.from("data_requests").insert({
    name: payload.name,
    email: payload.email,
    message: payload.message,
  });

  if (error) {
    console.error("supabase insert error (data_requests)", error);
    throw new DataRequestSaveError(error.message);
  }
}
