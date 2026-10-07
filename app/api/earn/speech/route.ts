// app/api/earn/speech/route.ts

import { NextResponse } from "next/server";
import {
  saveEarnSpeechParticipant,
  earnErrorResponse,
} from "@/lib/submissions/earn-persistence";
import { parseEarnSpeechRequest } from "@/lib/submissions/earn-parse";
import { sendEarnSpeechEmails } from "@/lib/email/earn-emails";
import { badRequest } from "@/lib/http";
import { checkEmailVerification } from "@/lib/verification/check";
import { consumeVerification } from "@/lib/verification/store";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit(req, "submit", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const parsed = await parseEarnSpeechRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const verifyError = await checkEmailVerification(
    "earn_speech",
    parsed.data.email,
    "You've already signed up for the speech program with this email.",
  );
  if (verifyError) return verifyError;

  try {
    const result = await saveEarnSpeechParticipant(parsed.data);

    try {
      await consumeVerification(parsed.data.email, "earn_speech");
    } catch (err) {
      console.error("earn speech verification cleanup failed", err);
    }

    try {
      await sendEarnSpeechEmails({
        payload: parsed.data,
        qualified: result.qualified,
        reasons: result.reasons,
      });
    } catch (err) {
      console.error("earn speech emails failed", err);
    }

    return NextResponse.json({ ok: true, qualified: result.qualified });
  } catch (err) {
    return earnErrorResponse(err, { exposeDevMessage: true });
  }
}
