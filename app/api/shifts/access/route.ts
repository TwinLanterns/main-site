// app/api/shifts/access/route.ts
//
// POST checks a filmer's shift code and sets the access cookie.
// DELETE clears it ("Not you?" on the board).

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  SHIFT_ACCESS_COOKIE,
  SHIFT_ACCESS_MAX_AGE,
  ShiftAccessConfigError,
  createShiftAccessToken,
  redeemShiftCode,
} from "@/lib/shift-access";

export async function POST(req: Request) {
  const limited = await rateLimit(req, "shift-access", 10, 15 * 60 * 1000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.slice(0, 64) : "";

  let holder;
  let token;
  try {
    holder = await redeemShiftCode(code);
    if (holder) token = await createShiftAccessToken(holder.id);
  } catch (err) {
    console.error("shift code check failed", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof ShiftAccessConfigError
            ? "Server misconfigured"
            : "Couldn't check that code — please try again.",
      },
      { status: err instanceof ShiftAccessConfigError ? 500 : 502 },
    );
  }

  if (!holder || !token) {
    return NextResponse.json(
      { ok: false, error: "That code didn't work. Check it and try again." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SHIFT_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SHIFT_ACCESS_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SHIFT_ACCESS_COOKIE);
  return res;
}
