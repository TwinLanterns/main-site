import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/resume/:path*",
    "/api/admin/vibe-search/:path*",
  ],
};

const LOGIN_PATH = "/admin/login";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isLoginPage = pathname === LOGIN_PATH;

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET is not set — blocking access.");
    return isApi
      ? NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
      : NextResponse.redirect(new URL(LOGIN_PATH, req.url));
  }

  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
  const valid = token !== "" && (await verifySessionToken(token, secret));

  // Already authenticated → keep them out of the login form.
  if (isLoginPage) {
    if (valid) {
      const url = new URL("/admin", req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!valid) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL(LOGIN_PATH, req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
