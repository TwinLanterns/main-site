// app/api/partner/refer/route.ts

import { NextResponse } from "next/server";
import {
  savePartnerAmbassador,
  PartnerConfigError,
  PartnerSaveError,
} from "@/lib/submissions/partner-persistence";
import { parsePartnerReferRequest } from "@/lib/submissions/partner-parse";
import { sendPartnerAmbassadorEmails } from "@/lib/email/partner-emails";
import { findDuplicateEmail } from "@/lib/verification/duplicate";
import {
  assertEmailVerified,
  consumeVerification,
  VerificationConfigError,
  VerificationRequiredError,
} from "@/lib/verification/store";

function getOrigin(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;

  return new URL(req.url).origin;
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  const parsed = await parsePartnerReferRequest(req);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }

  const { name, email } = parsed.data;

  try {
    if (await findDuplicateEmail("partner_ambassador", email)) {
      return NextResponse.json(
        {
          ok: false,
          error: "You're already an ambassador with this email.",
        },
        { status: 409 },
      );
    }
    await assertEmailVerified(email, "partner_ambassador");
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
    console.error("partner ambassador verification check failed", err);
    return NextResponse.json(
      { ok: false, error: "Save failed" },
      { status: 502 },
    );
  }

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
    if (err instanceof PartnerConfigError) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured" },
        { status: 500 },
      );
    }
    if (err instanceof PartnerSaveError) {
      return NextResponse.json(
        { ok: false, error: "Save failed" },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Save failed" },
      { status: 502 },
    );
  }
}
