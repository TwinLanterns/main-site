import { parseJsonBody } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
import { TERMS_REQUIRED_MESSAGE, termsAcceptance } from "@/lib/legal";
import type { EarnSignupPayload, EarnAmbassadorPayload } from "./earn-types";

export type ParseEarnSignupResult =
  | { ok: true; data: EarnSignupPayload }
  | { ok: false; status: 400; error: string };

export type ParseEarnReferResult =
  | { ok: true; data: EarnAmbassadorPayload }
  | { ok: false; status: 400; error: string };

// Narrow unknown → string | undefined. Never throws.
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// Shared by the three program sign-up routes (internship, GoPro, speech).
export async function parseEarnSignupRequest(
  req: Request,
): Promise<ParseEarnSignupResult> {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
  const body = parsed.body;

  if (typeof body !== "object" || body === null || !("payload" in body)) {
    return { ok: false, status: 400, error: "Missing fields" };
  }

  const payload = (body as { payload: unknown }).payload;
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, status: 400, error: "Missing fields" };
  }

  const p = payload as Record<string, unknown>;

  const firstName = str(p.firstName)?.trim() ?? "";
  const email = str(p.email)?.trim() ?? "";

  const lastName = str(p.lastName)?.trim() ?? "";
  const phone = str(p.phone)?.trim() ?? "";

  if (!firstName || !lastName || !email || !isValidEmail(email)) {
    return { ok: false, status: 400, error: "Missing or invalid name/email" };
  }

  const phoneDigits = phone.replace(/\D/g, "").length;
  if (phoneDigits < 10 || phoneDigits > 15) {
    return { ok: false, status: 400, error: "Missing or invalid phone number" };
  }

  if (p.acceptedTerms !== true) {
    return { ok: false, status: 400, error: TERMS_REQUIRED_MESSAGE };
  }

  const data: EarnSignupPayload = {
    firstName,
    lastName,
    email,
    phone,
    referredBy: str(p.referredBy)?.trim() || undefined,
    referrerCollege: str(p.referrerCollege)?.trim() || undefined,
    referredByCode: str(p.referredByCode)?.trim() || null,
    ...termsAcceptance(),
  };

  return { ok: true, data };
}

export async function parseEarnReferRequest(
  req: Request,
): Promise<ParseEarnReferResult> {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
  const body = parsed.body;

  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, error: "Missing or invalid name/email" };
  }

  const { name, email, acceptedTerms } = body as Record<string, unknown>;

  const nameStr = typeof name === "string" ? name.trim() : "";
  const emailStr = typeof email === "string" ? email.trim() : "";

  if (!nameStr || !emailStr || !isValidEmail(emailStr)) {
    return { ok: false, status: 400, error: "Missing or invalid name/email" };
  }

  if (acceptedTerms !== true) {
    return { ok: false, status: 400, error: TERMS_REQUIRED_MESSAGE };
  }

  return {
    ok: true,
    data: { name: nameStr, email: emailStr, ...termsAcceptance() },
  };
}
