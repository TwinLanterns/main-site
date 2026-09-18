// app/api/partner/refer/route.ts

import { NextResponse } from "next/server";
import {
  savePartnerAmbassador,
  partnerErrorResponse,
} from "@/lib/submissions/partner-persistence";
import { parsePartnerReferRequest } from "@/lib/submissions/partner-parse";
import { sendPartnerAmbassadorEmails } from "@/lib/email/partner-emails";
import { badRequest } from "@/lib/http";
import { checkEmailVerification } from "@/lib/verification/check";
import { consumeVerification } from "@/lib/verification/store";

function getOrigin(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;

  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const parsed = await parsePartnerReferRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const { name, email } = parsed.data;

  const verifyError = await checkEmailVerification(
    "partner_ambassador",
    email,
    "You're already an ambassador with this email.",
  );
  if (verifyError) return verifyError;

  try {
    const { code } = await savePartnerAmbassador({ name, email });

    try {
      await consumeVerification(email, "partner_ambassador");
    } catch (err) {
      console.error("partner ambassador verification cleanup failed", err);
    }

    const referralUrl = `${getOrigin(req)}/partner/apply?ref=${encodeURIComponent(code)}`;

    try {
      await sendPartnerAmbassadorEmails({
        payload: { name, email },
        code,
        referralUrl,
      });
    } catch (err) {
      console.error("partner ambassador emails failed", err);
    }

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    return partnerErrorResponse(err);
  }
}
