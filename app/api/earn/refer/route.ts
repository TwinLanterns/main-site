// app/api/earn/refer/route.ts

import { NextResponse } from "next/server";
import {
  saveEarnAmbassador,
  earnErrorResponse,
} from "@/lib/submissions/earn-persistence";
import { parseEarnReferRequest } from "@/lib/submissions/earn-parse";
import { sendEarnAmbassadorEmails } from "@/lib/email/earn-emails";
import { badRequest } from "@/lib/http";
import { checkEmailVerification } from "@/lib/verification/check";
import { consumeVerification } from "@/lib/verification/store";
import { rateLimit } from "@/lib/rate-limit";
import { LEGAL } from "@/lib/legal";

// The referral link is emailed, so never build it from request headers
// (Host / X-Forwarded-Host are client-influenced off-platform).
function getOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return (envUrl || LEGAL.site).replace(/\/$/, "");
}

const DUPLICATE_MESSAGE =
  "You're already an ambassador with this email.";

export async function POST(req: Request) {
  const limited = await rateLimit(req, "submit", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const parsed = await parseEarnReferRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const payload = parsed.data;
  const { email } = payload;

  const verifyError = await checkEmailVerification(
    "earn_ambassador",
    email,
    DUPLICATE_MESSAGE,
  );
  if (verifyError) return verifyError;

  try {
    const { code } = await saveEarnAmbassador(payload);

    try {
      await consumeVerification(email, "earn_ambassador");
    } catch (err) {
      console.error("earn ambassador verification cleanup failed", err);
    }

    const referralUrl = `${getOrigin()}/earn/apply?ref=${encodeURIComponent(code)}`;

    try {
      await sendEarnAmbassadorEmails({
        payload,
        code,
        referralUrl,
      });
    } catch (err) {
      console.error("earn ambassador emails failed", err);
    }

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    return earnErrorResponse(err, { duplicateMessage: DUPLICATE_MESSAGE });
  }
}
