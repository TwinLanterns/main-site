// app/api/earn/gopro/route.ts

import { NextResponse } from "next/server";
import {
  saveEarnGoproApplicant,
  earnErrorResponse,
} from "@/lib/submissions/earn-persistence";
import { parseEarnGoproRequest } from "@/lib/submissions/earn-parse";
import { sendEarnGoproEmails } from "@/lib/email/earn-emails";
import { badRequest } from "@/lib/http";
import { checkEmailVerification } from "@/lib/verification/check";
import { consumeVerification } from "@/lib/verification/store";

export async function POST(req: Request) {
  const parsed = await parseEarnGoproRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const verifyError = await checkEmailVerification(
    "earn_gopro",
    parsed.data.email,
    "You've already signed up for the GoPro program with this email.",
  );
  if (verifyError) return verifyError;

  try {
    const result = await saveEarnGoproApplicant(parsed.data);

    try {
      await consumeVerification(parsed.data.email, "earn_gopro");
    } catch (err) {
      console.error("earn gopro verification cleanup failed", err);
    }

    try {
      await sendEarnGoproEmails({
        payload: parsed.data,
        qualified: result.qualified,
        reasons: result.reasons,
      });
    } catch (err) {
      console.error("earn gopro emails failed", err);
    }

    return NextResponse.json({ ok: true, qualified: result.qualified });
  } catch (err) {
    return earnErrorResponse(err, { exposeDevMessage: true });
  }
}
