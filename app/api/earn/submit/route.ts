// app/api/earn/submit/route.ts

import { NextResponse } from "next/server";
import {
  saveEarnApplicant,
  earnErrorResponse,
} from "@/lib/submissions/earn-persistence";
import { parseEarnApplicantRequest } from "@/lib/submissions/earn-parse";
import { sendEarnApplicantEmails } from "@/lib/email/earn-emails";
import { badRequest } from "@/lib/http";
import { checkEmailVerification } from "@/lib/verification/check";
import { consumeVerification } from "@/lib/verification/store";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit(req, "submit", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const parsed = await parseEarnApplicantRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const verifyError = await checkEmailVerification(
    "earn_applicant",
    parsed.data.email,
    "You've already applied to Earn with this email.",
  );
  if (verifyError) return verifyError;

  try {
    const result = await saveEarnApplicant(parsed.data);

    try {
      await consumeVerification(parsed.data.email, "earn_applicant");
    } catch (err) {
      console.error("earn applicant verification cleanup failed", err);
    }

    try {
      await sendEarnApplicantEmails({
        payload: parsed.data,
        qualified: result.qualified,
        reasons: result.reasons,
      });
    } catch (err) {
      console.error("earn applicant emails failed", err);
    }

    return NextResponse.json({
      ok: true,
      qualified: result.qualified,
    });
  } catch (err) {
    return earnErrorResponse(err, { exposeDevMessage: true });
  }
}
