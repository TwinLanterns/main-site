// app/api/partner/submit/route.ts

import { NextResponse } from "next/server";
import {
  savePartnerApplicant,
  PartnerConfigError,
  PartnerSaveError,
} from "@/lib/submissions/partner-persistence";
import type {
  PartnerApplicantPayload,
} from "@/lib/submissions/partner-types";
import type { DeviceOs } from "@/lib/submissions/partner-eligibility";
import { sendPartnerApplicantEmails } from "@/lib/email/partner-emails";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

// Narrow unknown → string | undefined. Never throws.
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// Strict boolean: only literal `true` passes. `"false"`, `1`, etc. all fail.
function bool(v: unknown): boolean {
  return v === true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  if (typeof body !== "object" || body === null || !("payload" in body)) {
    return badRequest("Missing fields");
  }

  const payload = (body as { payload: unknown }).payload;
  if (typeof payload !== "object" || payload === null) {
    return badRequest("Missing fields");
  }

  const p = payload as Record<string, unknown>;

  const firstName = str(p.firstName)?.trim() ?? "";
  const email = str(p.email)?.trim() ?? "";

  if (!firstName || !email || !EMAIL_RE.test(email)) {
    return badRequest("Missing or invalid name/email");
  }

  // Enum-validate deviceOs — anything other than the two literals becomes "".
  const deviceOs: DeviceOs | "" =
    p.deviceOs === "ios" || p.deviceOs === "android" ? p.deviceOs : "";

  const taskInterests = Array.isArray(p.taskInterests)
    ? p.taskInterests.filter((x): x is string => typeof x === "string")
    : [];

  const normalized: PartnerApplicantPayload = {
    firstName,
    lastName: str(p.lastName)?.trim() || undefined,
    email,
    phone: str(p.phone)?.trim() || undefined,
    location: str(p.location)?.trim() || undefined,
    deviceOs,
    deviceModel: str(p.deviceModel)?.trim() || "",
    taskInterests,
    filmingAck: bool(p.filmingAck),
    consent: bool(p.consent),
    referredByCode: str(p.referredByCode)?.trim() || null,
  };

    try {
    const result = await savePartnerApplicant(normalized);

    try {
        await sendPartnerApplicantEmails({
        payload: normalized,
        qualified: result.qualified,
        reasons: result.reasons,
        });
    } catch (err) {
        console.error("partner applicant emails failed", err);
    }

    return NextResponse.json({
        ok: true,
        qualified: result.qualified,
    });
    } catch (err) {
    if (err instanceof PartnerConfigError) {
      return NextResponse.json(
            {
            ok: false,
            error:
                process.env.NODE_ENV === "development"
                ? err.message
                : "Server Misconfigured",
            },
            { status: 500 },
        );
    }
    if (err instanceof PartnerSaveError) {
        return NextResponse.json(
            {
            ok: false,
            error:
                process.env.NODE_ENV === "development"
                ? err.message
                : "Save failed",
            },
            { status: 502 },
        );
    }
    return NextResponse.json(
      { ok: false, error: "Save failed" },
      { status: 502 },
    );
  }
}