// app/api/verify/send/route.ts

import { NextResponse } from "next/server";
import { badRequest, parseJsonBody } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
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

const DUPLICATE_MESSAGE: Record<VerificationPurpose, string> = {
  student: "You've already applied with this email.",
  company: "You've already sent a brief with this email.",
  earn_applicant: "You've already applied to Earn with this email.",
  earn_ambassador: "You're already a Earn ambassador with this email.",
  earn_gopro: "You've already signed up for the GoPro program with this email.",
  earn_speech: "You've already signed up for the speech program with this email.",
};

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) {
    return badRequest("Invalid JSON");
  }
  const body = parsed.body;

  if (typeof body !== "object" || body === null) {
    return badRequest("Missing fields");
  }

  const { email, purpose } = body as { email?: unknown; purpose?: unknown };

  if (typeof email !== "string" || !isValidEmail(email)) {
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
