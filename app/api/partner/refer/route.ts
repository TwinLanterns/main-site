// app/api/partner/refer/route.ts

import { NextResponse } from "next/server";
import {
  savePartnerAmbassador,
  PartnerConfigError,
  PartnerSaveError,
} from "@/lib/submissions/partner-persistence";
import { sendPartnerAmbassadorEmails } from "@/lib/email/partner-emails";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  if (typeof body !== "object" || body === null) {
    return badRequest("Missing or invalid name/email");
  }

  const { name, email } = body as Record<string, unknown>;

  const nameStr = typeof name === "string" ? name.trim() : "";
  const emailStr = typeof email === "string" ? email.trim() : "";

  if (!nameStr || !emailStr || !EMAIL_RE.test(emailStr)) {
    return badRequest("Missing or invalid name/email");
  }

    try {
    const { code } = await savePartnerAmbassador({
        name: nameStr,
        email: emailStr,
    });

    const referralUrl = `${getOrigin(req)}/partner/apply?ref=${encodeURIComponent(code)}`;

    try {
        await sendPartnerAmbassadorEmails({
        payload: { name: nameStr, email: emailStr },
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