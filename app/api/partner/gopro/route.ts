// app/api/partner/gopro/route.ts

import { NextResponse } from "next/server";
import {
  savePartnerGoproApplicant,
  partnerErrorResponse,
} from "@/lib/submissions/partner-persistence";
import { parsePartnerGoproRequest } from "@/lib/submissions/partner-parse";
import { sendPartnerGoproEmails } from "@/lib/email/partner-emails";
import { badRequest } from "@/lib/http";
import { checkEmailVerification } from "@/lib/verification/check";
import { consumeVerification } from "@/lib/verification/store";

export async function POST(req: Request) {
  const parsed = await parsePartnerGoproRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const verifyError = await checkEmailVerification(
    "partner_gopro",
    parsed.data.email,
    "You've already signed up for the GoPro program with this email.",
  );
  if (verifyError) return verifyError;

  try {
    const result = await savePartnerGoproApplicant(parsed.data);

    try {
      await consumeVerification(parsed.data.email, "partner_gopro");
    } catch (err) {
      console.error("partner gopro verification cleanup failed", err);
    }

    try {
      await sendPartnerGoproEmails({
        payload: parsed.data,
        qualified: result.qualified,
        reasons: result.reasons,
      });
    } catch (err) {
      console.error("partner gopro emails failed", err);
    }

    return NextResponse.json({ ok: true, qualified: result.qualified });
  } catch (err) {
    return partnerErrorResponse(err, { exposeDevMessage: true });
  }
}
