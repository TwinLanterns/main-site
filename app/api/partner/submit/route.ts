// app/api/partner/submit/route.ts

import { NextResponse } from "next/server";
import {
  savePartnerApplicant,
  PartnerConfigError,
  PartnerSaveError,
} from "@/lib/submissions/partner-persistence";
import { parsePartnerApplicantRequest } from "@/lib/submissions/partner-parse";
import { sendPartnerApplicantEmails } from "@/lib/email/partner-emails";
import { findDuplicateEmail } from "@/lib/verification/duplicate";
import {
  assertEmailVerified,
  consumeVerification,
  VerificationConfigError,
  VerificationRequiredError,
} from "@/lib/verification/store";

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  const parsed = await parsePartnerApplicantRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  try {
    if (await findDuplicateEmail("partner_applicant", parsed.data.email)) {
      return NextResponse.json(
        {
          ok: false,
          error: "You've already applied to Partner with this email.",
        },
        { status: 409 },
      );
    }
    await assertEmailVerified(parsed.data.email, "partner_applicant");
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
    console.error("partner applicant verification check failed", err);
    return NextResponse.json(
      { ok: false, error: "Save failed" },
      { status: 502 },
    );
  }

  try {
    const result = await savePartnerApplicant(parsed.data);

    try {
      await consumeVerification(parsed.data.email, "partner_applicant");
    } catch (err) {
      console.error("partner applicant verification cleanup failed", err);
    }

    try {
      await sendPartnerApplicantEmails({
        payload: parsed.data,
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
              : "Server misconfigured",
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
