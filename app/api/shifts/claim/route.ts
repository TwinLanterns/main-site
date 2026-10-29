// app/api/shifts/claim/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { badRequest } from "@/lib/http";
import { SHIFT_ACCESS_COOKIE, hasShiftAccess } from "@/lib/shift-access";
import { rateLimit } from "@/lib/rate-limit";
import {
  ShiftConfigError,
  ShiftUnavailableError,
  claimShift,
  parseShiftClaim,
} from "@/lib/submissions/film-shifts";
import { sendShiftClaimEmails } from "@/lib/email/shift-emails";

export async function POST(req: Request) {
  const limited = await rateLimit(req, "shift-claim", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const token = (await cookies()).get(SHIFT_ACCESS_COOKIE)?.value;
  if (!(await hasShiftAccess(token))) {
    return NextResponse.json(
      { ok: false, error: "Enter the shift code first." },
      { status: 401 },
    );
  }

  const parsed = await parseShiftClaim(req);
  if (!parsed.ok) return badRequest(parsed.error);
  if ("spam" in parsed) return NextResponse.json({ ok: true });

  let shift;
  try {
    shift = await claimShift(parsed.data);
  } catch (err) {
    if (err instanceof ShiftUnavailableError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    console.error("shift claim failed", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof ShiftConfigError
            ? "Server misconfigured"
            : "Couldn't save that — please try again.",
      },
      { status: err instanceof ShiftConfigError ? 500 : 502 },
    );
  }

  try {
    await sendShiftClaimEmails(parsed.data, shift);
  } catch (err) {
    // Email is best-effort. The claim is already saved.
    console.error("shift claim email failed", err);
  }

  return NextResponse.json({ ok: true });
}
