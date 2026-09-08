import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/admin-auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/resume/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let the login page itself through — everything else under /admin is gated.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET is not set — blocking /admin access.");
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const token = req.cookies.get("admin_session")?.value;
  
  // 🔍 Debug logging
  console.log("=== MIDDLEWARE DEBUG ===");
  console.log("Path:", pathname);
  console.log("Has token:", !!token);
  console.log("Token:", token ? token.substring(0, 50) + "..." : "none");
  console.log("Secret exists:", !!secret);
  
  const valid = await verifySessionToken(token, secret);
  console.log("Token valid:", valid);

  if (!valid) {
    console.log("❌ Redirecting to login from:", pathname);
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log("✅ Access granted to:", pathname);
  return NextResponse.next();
}