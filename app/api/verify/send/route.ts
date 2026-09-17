// app/api/verify/send/route.ts

import { NextResponse } from "next/server";
import { findDuplicateEmail } from "@/lib/verification/duplicate";
import {
  issueVerificationCode,
  VerificationConfigError,
  VerificationRequestError,
} from "@/lib/verification/store";
import {
  VERIFICATION_PURPOSES,
  type VerificationPurpose,
} from "@/lib/verification/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DUPLICATE_MESSAGE: Record<VerificationPurpose, string> = {
  student: "You've already applied with this email.",
  company: "You've already sent a brief with this email.",
  partner_applicant: "You've already applied to Partner with this email.",
  partner_ambassador: "You're already a Partner ambassador with this email.",
};

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  if (typeof body !== "object" || body === null) {
    return badRequest("Missing fields");
  }

  const { email, purpose } = body as { email?: unknown; purpose?: unknown };

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return badRequest("Missing or invalid email");
  }

  if (
    typeof purpose !== "string" ||
    !VERIFICATION_PURPOSES.includes(purpose as VerificationPurpose)
  ) {
    return badRequest("Invalid purpose");
  }

  const typedPurpose = purpose as VerificationPurpose;

  try {
    if (await findDuplicateEmail(typedPurpose, email)) {
      return NextResponse.json(
        { ok: false, error: DUPLICATE_MESSAGE[typedPurpose] },
        { status: 409 },
      );
    }

    await issueVerificationCode(email, typedPurpose);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof VerificationConfigError) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured" },
        { status: 500 },
      );
    }
    if (err instanceof VerificationRequestError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("verify/send failed", err);
    return NextResponse.json(
      { ok: false, error: "Could not send a code" },
      { status: 502 },
    );
  }
}
