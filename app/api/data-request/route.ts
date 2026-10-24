// app/api/data-request/route.ts

import { NextResponse } from "next/server";
import { badRequest } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import {
  DataRequestConfigError,
  parseDataRequest,
  saveDataRequest,
} from "@/lib/submissions/data-request";
import { sendDataRequestEmails } from "@/lib/email/data-request-emails";

export async function POST(req: Request) {
  const limited = await rateLimit(req, "data-request", 5, 60 * 60 * 1000);
  if (limited) return limited;

  const parsed = await parseDataRequest(req);
  if (!parsed.ok) return badRequest(parsed.error);
  if ("spam" in parsed) return NextResponse.json({ ok: true });

  try {
    await saveDataRequest(parsed.data);
  } catch (err) {
    console.error("data request save failed", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof DataRequestConfigError
            ? "Server misconfigured"
            : "Couldn't send that — please email hello@twinlanterns.co.",
      },
      { status: err instanceof DataRequestConfigError ? 500 : 502 },
    );
  }

  try {
    await sendDataRequestEmails(parsed.data);
  } catch (err) {
    // Email is best-effort. The request is already saved.
    console.error("data request email failed", err);
  }

  return NextResponse.json({ ok: true });
}
