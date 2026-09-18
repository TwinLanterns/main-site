// app/api/verify/confirm/route.ts

import { NextResponse } from "next/server";
import { badRequest, parseJsonBody } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
import {
  confirmVerificationCode,
  VerificationConfigError,
  VerificationRequestError,
} from "@/lib/verification/store";
import {
  VERIFICATION_PURPOSES,
  type VerificationPurpose,
} from "@/lib/verification/types";

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) {
    return badRequest("Invalid JSON");
  }
  const body = parsed.body;

  if (typeof body !== "object" || body === null) {
    return badRequest("Missing fields");
  }

  const { email, purpose, code } = body as {
    email?: unknown;
    purpose?: unknown;
    code?: unknown;
  };

  if (typeof email !== "string" || !isValidEmail(email)) {
    return badRequest("Missing or invalid email");
  }

  if (
    typeof purpose !== "string" ||
    !VERIFICATION_PURPOSES.includes(purpose as VerificationPurpose)
  ) {
    return badRequest("Invalid purpose");
  }

  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    return badRequest("Invalid code");
  }

  try {
    await confirmVerificationCode(email, purpose as VerificationPurpose, code);
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
    console.error("verify/confirm failed", err);
    return NextResponse.json(
      { ok: false, error: "Could not confirm that code" },
      { status: 502 },
    );
  }
}
