// app/api/shifts/access/route.ts
//
// Checks the shared shift-board code and sets the access cookie.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import {
  SHIFT_ACCESS_COOKIE,
  SHIFT_ACCESS_MAX_AGE,
  createShiftAccessToken,
  normalizeShiftCode,
  shiftAccessConfigured,
} from "@/lib/shift-access";

function safeCompare(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Keep mismatched lengths on roughly the same timing.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, "shift-access", 10, 15 * 60 * 1000);
  if (limited) return limited;

  if (!shiftAccessConfigured()) {
    console.error("SHIFTS_ACCESS_CODE / ADMIN_SESSION_SECRET not set.");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? normalizeShiftCode(body.code) : "";
  const expected = normalizeShiftCode(process.env.SHIFTS_ACCESS_CODE!);

  if (!code || !safeCompare(code, expected)) {
    return NextResponse.json(
      { ok: false, error: "That code didn't work. Check it and try again." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SHIFT_ACCESS_COOKIE, await createShiftAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SHIFT_ACCESS_MAX_AGE,
  });
  return res;
}
