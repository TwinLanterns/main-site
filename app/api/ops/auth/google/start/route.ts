// app/api/ops/auth/google/start/route.ts
//
// Starts "Sign in with Google": stores state/nonce/PKCE verifier in a
// short-lived httpOnly cookie and redirects to Google. Exempt from the
// proxy.ts session check (the caller isn't signed in yet).

import { NextResponse } from "next/server";
import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_FLOW_COOKIE,
  GOOGLE_FLOW_MAX_AGE,
  authorizationUrl,
  encodeFlow,
  googleConfig,
  pkceChallenge,
  randomToken,
  safeOpsPath,
} from "@/lib/ops/google-sso";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cfg = googleConfig();
  if (!cfg) return NextResponse.redirect(new URL("/ops/login?error=google_unavailable", url));

  const flow = { state: randomToken(), nonce: randomToken(), verifier: randomToken(48), from: safeOpsPath(url.searchParams.get("from")) };
  const redirectUri = new URL(GOOGLE_CALLBACK_PATH, url).toString();
  const res = NextResponse.redirect(authorizationUrl(cfg, redirectUri, flow, await pkceChallenge(flow.verifier)));
  res.cookies.set(GOOGLE_FLOW_COOKIE, encodeFlow(flow), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax so the cookie comes back on Google's top-level redirect.
    sameSite: "lax",
    path: "/api/ops/auth/google",
    maxAge: GOOGLE_FLOW_MAX_AGE,
  });
  return res;
}
