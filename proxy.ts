import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/admin-auth";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/resume/:path*",
    "/api/admin/vibe-search/:path*"
  ],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET is not set — blocking access.");
    return pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
      : NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const token = req.cookies.get("admin_session")?.value;
  const valid = await verifySessionToken(token, secret);

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}