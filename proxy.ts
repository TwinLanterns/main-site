import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { OPS_COOKIE_NAME, verifyTeamToken } from "@/lib/ops/team-token";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/resume/:path*",
    "/api/admin/vibe-search/:path*",
    "/api/admin/shifts/:path*",
    "/ops/:path*",
    "/api/ops/:path*",
  ],
};

const LOGIN_PATH = "/admin/login";
const OPS_LOGIN_PATH = "/ops/login";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isOps = pathname === "/ops" || pathname.startsWith("/ops/") || pathname.startsWith("/api/ops/");
  const loginPath = isOps ? OPS_LOGIN_PATH : LOGIN_PATH;
  const isLoginPage = pathname === loginPath;

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET is not set — blocking access.");
    // Fail loudly for pages too: redirecting to the login page would hide
    // the misconfiguration (login can't succeed without the secret either).
    return isApi
      ? NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
      : new NextResponse("Server misconfigured", { status: 500 });
  }

  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
  const adminValid = token !== "" && (await verifySessionToken(token, secret));
  // /ops also takes a per-person team session. This only checks the
  // signature; lib/ops/auth.ts re-checks the member (active, role, projects)
  // on every page and action.
  const valid =
    adminValid ||
    (isOps && (await verifyTeamToken(req.cookies.get(OPS_COOKIE_NAME)?.value, secret)) !== null);

  // Already authenticated → keep them out of the login form. Not for
  // /ops/login: a signed token can belong to a deactivated member, so that
  // page checks the member itself (redirecting here would loop).
  if (isLoginPage) {
    if (valid && !isOps) {
      const url = new URL("/admin", req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!valid) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL(loginPath, req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
