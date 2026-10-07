// app/api/partner/speech/route.ts

import { NextResponse } from "next/server";
import {
  savePartnerSpeechParticipant,
  partnerErrorResponse,
} from "@/lib/submissions/partner-persistence";
import { parsePartnerSpeechRequest } from "@/lib/submissions/partner-parse";
import { sendPartnerSpeechEmails } from "@/lib/email/partner-emails";
import { badRequest } from "@/lib/http";
import { checkEmailVerification } from "@/lib/verification/check";
import { consumeVerification } from "@/lib/verification/store";

export async function POST(req: Request) {
  const parsed = await parsePartnerSpeechRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const verifyError = await checkEmailVerification(
    "partner_speech",
    parsed.data.email,
    "You've already signed up for the speech program with this email.",
  );
  if (verifyError) return verifyError;

  try {
    const result = await savePartnerSpeechParticipant(parsed.data);

    try {
      await consumeVerification(parsed.data.email, "partner_speech");
    } catch (err) {
      console.error("partner speech verification cleanup failed", err);
    }

    try {
      await sendPartnerSpeechEmails({
        payload: parsed.data,
        qualified: result.qualified,
        reasons: result.reasons,
      });
    } catch (err) {
      console.error("partner speech emails failed", err);
    }

    return NextResponse.json({ ok: true, qualified: result.qualified });
  } catch (err) {
    return partnerErrorResponse(err, { exposeDevMessage: true });
  }
}
