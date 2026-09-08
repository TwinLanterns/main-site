import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createSessionToken } from "@/lib/admin-auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

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
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!expectedUsername || !expectedPassword || !secret) {
    console.error("ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_SESSION_SECRET not fully configured.");
    return NextResponse.json({ error: "Admin auth is not configured on the server." }, { status: 500 });
  }

  const ok =
    username.length > 0 &&
    password.length > 0 &&
    safeCompare(username, expectedUsername) &&
    safeCompare(password, expectedPassword);

  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = await createSessionToken(secret, SESSION_MAX_AGE_SECONDS);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
