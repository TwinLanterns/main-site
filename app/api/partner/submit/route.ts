// app/api/partner/submit/route.ts

import { NextResponse } from "next/server";
import {
  savePartnerApplicant,
  partnerErrorResponse,
} from "@/lib/submissions/partner-persistence";
import { parsePartnerApplicantRequest } from "@/lib/submissions/partner-parse";
import { sendPartnerApplicantEmails } from "@/lib/email/partner-emails";
import { badRequest } from "@/lib/http";
import { checkEmailVerification } from "@/lib/verification/check";
import { consumeVerification } from "@/lib/verification/store";

export async function POST(req: Request) {
  const parsed = await parsePartnerApplicantRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const verifyError = await checkEmailVerification(
    "partner_applicant",
    parsed.data.email,
    "You've already applied to Partner with this email.",
  );
  if (verifyError) return verifyError;

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
    return partnerErrorResponse(err, { exposeDevMessage: true });
  }
}
