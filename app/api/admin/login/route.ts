import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

function safeCompare(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do a comparison so mismatched-length attempts take the same
    // rough time as matched-length ones (avoids leaking length via timing).
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "admin-login", 5, 15 * 60 * 1000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!expectedUsername || !expectedPassword || !secret) {
    console.error(
      "ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_SESSION_SECRET not fully configured.",
    );
    return NextResponse.json(
      { error: "Admin auth is not configured on the server." },
      { status: 500 },
    );
  }

  const ok =
    username.length > 0 &&
    password.length > 0 &&
    safeCompare(username, expectedUsername) &&
    safeCompare(password, expectedPassword);

  if (!ok) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  }

  const token = await createSessionToken(secret, ADMIN_SESSION_MAX_AGE);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return res;
}
