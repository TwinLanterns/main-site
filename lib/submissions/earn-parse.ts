import { parseJsonBody } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
import { TERMS_REQUIRED_MESSAGE, termsAcceptance } from "@/lib/legal";
import type {
  EarnApplicantPayload,
  EarnAmbassadorPayload,
  EarnGoproPayload,
  EarnSpeechPayload,
} from "./earn-types";
import type { DeviceOs } from "./earn-eligibility";

export type ParseEarnApplicantResult =
  | { ok: true; data: EarnApplicantPayload }
  | { ok: false; status: 400; error: string };

export type ParseEarnGoproResult =
  | { ok: true; data: EarnGoproPayload }
  | { ok: false; status: 400; error: string };

export type ParseEarnSpeechResult =
  | { ok: true; data: EarnSpeechPayload }
  | { ok: false; status: 400; error: string };

export type ParseEarnReferResult =
  | { ok: true; data: EarnAmbassadorPayload }
  | { ok: false; status: 400; error: string };

// Narrow unknown → string | undefined. Never throws.
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// Strict boolean: only literal `true` passes. `"false"`, `1`, etc. all fail.
function bool(v: unknown): boolean {
  return v === true;
}

export async function parseEarnApplicantRequest(
  req: Request,
): Promise<ParseEarnApplicantResult> {
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

  if (!firstName || !email || !isValidEmail(email)) {
    return { ok: false, status: 400, error: "Missing or invalid name/email" };
  }

  // Enum-validate deviceOs — anything other than the two literals becomes "".
  const deviceOs: DeviceOs | "" =
    p.deviceOs === "ios" || p.deviceOs === "android" ? p.deviceOs : "";

  const taskInterests = Array.isArray(p.taskInterests)
    ? p.taskInterests.filter((x): x is string => typeof x === "string")
    : [];

  if (p.acceptedTerms !== true) {
    return { ok: false, status: 400, error: TERMS_REQUIRED_MESSAGE };
  }

  const data: EarnApplicantPayload = {
    firstName,
    lastName: str(p.lastName)?.trim() || undefined,
    email,
    phone: str(p.phone)?.trim() || undefined,
    location: str(p.location)?.trim() || undefined,
    referredBy: str(p.referredBy)?.trim() || undefined,
    referrerCollege: str(p.referrerCollege)?.trim() || undefined,
    deviceOs,
    deviceModel: str(p.deviceModel)?.trim() || "",
    taskInterests,
    filmingAck: bool(p.filmingAck),
    consent: bool(p.consent),
    referredByCode: str(p.referredByCode)?.trim() || null,
    ...termsAcceptance(),
  };

  return { ok: true, data };
}

export async function parseEarnGoproRequest(
  req: Request,
): Promise<ParseEarnGoproResult> {
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

  if (!firstName || !email || !isValidEmail(email)) {
    return { ok: false, status: 400, error: "Missing or invalid name/email" };
  }

  if (p.acceptedTerms !== true) {
    return { ok: false, status: 400, error: TERMS_REQUIRED_MESSAGE };
  }

  const data: EarnGoproPayload = {
    firstName,
    lastName: str(p.lastName)?.trim() || undefined,
    email,
    phone: str(p.phone)?.trim() || undefined,
    location: str(p.location)?.trim() || undefined,
    referredBy: str(p.referredBy)?.trim() || undefined,
    referrerCollege: str(p.referrerCollege)?.trim() || undefined,
    isAdult: bool(p.isAdult),
    hasCoreAreas: bool(p.hasCoreAreas),
    canKeepOthersOut: bool(p.canKeepOthersOut),
    weeklyHoursOk: bool(p.weeklyHoursOk),
    consent: bool(p.consent),
    referredByCode: str(p.referredByCode)?.trim() || null,
    ...termsAcceptance(),
  };

  return { ok: true, data };
}

export async function parseEarnSpeechRequest(
  req: Request,
): Promise<ParseEarnSpeechResult> {
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

  if (!firstName || !email || !isValidEmail(email)) {
    return { ok: false, status: 400, error: "Missing or invalid name/email" };
  }

  const age =
    typeof p.age === "number" && Number.isInteger(p.age) && p.age > 0 && p.age < 120
      ? p.age
      : null;

  if (p.acceptedTerms !== true) {
    return { ok: false, status: 400, error: TERMS_REQUIRED_MESSAGE };
  }

  const data: EarnSpeechPayload = {
    firstName,
    lastName: str(p.lastName)?.trim() || undefined,
    email,
    phone: str(p.phone)?.trim() || undefined,
    referredBy: str(p.referredBy)?.trim() || undefined,
    referrerCollege: str(p.referrerCollege)?.trim() || undefined,
    age,
    sex: str(p.sex)?.trim() ?? "",
    raceEthnicity: str(p.raceEthnicity)?.trim() ?? "",
    accent: str(p.accent)?.trim() ?? "",
    region: str(p.region)?.trim() || undefined,
    firstLanguageEnglish: bool(p.firstLanguageEnglish),
    guardianConsent: bool(p.guardianConsent),
    availabilityOk: bool(p.availabilityOk),
    consent: bool(p.consent),
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
