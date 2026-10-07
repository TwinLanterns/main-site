// lib/verification/check.ts
//
// Shared duplicate-email + verified-email gate used by every submit-like
// route (app/api/submit, app/api/earn/submit, app/api/earn/refer) right
// before it persists anything.

import { NextResponse } from "next/server";
import { findDuplicateEmail } from "./duplicate";
import {
  assertEmailVerified,
  VerificationConfigError,
  VerificationRequiredError,
} from "./store";
import type { VerificationPurpose } from "./types";

export async function checkEmailVerification(
  purpose: VerificationPurpose,
  email: string,
  duplicateMessage: string,
): Promise<NextResponse | null> {
  try {
    if (await findDuplicateEmail(purpose, email)) {
      return NextResponse.json(
        { ok: false, error: duplicateMessage },
        { status: 409 },
      );
    }
    await assertEmailVerified(email, purpose);
    return null;
  } catch (err) {
    if (err instanceof VerificationConfigError) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured" },
        { status: 500 },
      );
    }
    if (err instanceof VerificationRequiredError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 400 },
      );
    }
    console.error("verification check failed", err);
    return NextResponse.json(
      { ok: false, error: "Save failed" },
      { status: 502 },
    );
  }
}
