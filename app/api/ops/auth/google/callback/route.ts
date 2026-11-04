// app/api/ops/auth/google/callback/route.ts
//
// Google redirects here with ?code&state. We check state against the flow
// cookie, swap the code (with the PKCE verifier and client secret) for an
// ID token, check its claims, then sign in the active team member with that
// email — the same ops_session cookie as password sign-in. Exempt from the
// proxy.ts session check.

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/ops/db";
import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_FLOW_COOKIE,
  GOOGLE_TOKEN_URL,
  checkIdToken,
  decodeFlow,
  googleConfig,
  sameString,
} from "@/lib/ops/google-sso";
import { OPS_COOKIE_NAME, OPS_COOKIE_OPTIONS, createTeamToken } from "@/lib/ops/team-token";
import { rateLimitKey } from "@/lib/rate-limit";

function fail(url: URL, code: string, from?: string) {
  const to = new URL("/ops/login", url);
  to.searchParams.set("error", code);
  if (from && from !== "/ops") to.searchParams.set("from", from);
  const res = NextResponse.redirect(to);
  res.cookies.set(GOOGLE_FLOW_COOKIE, "", { path: "/api/ops/auth/google", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cfg = googleConfig();
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!cfg || !secret) return fail(url, "google_unavailable");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (await rateLimitKey(`ops-google:${ip}`, 10, 15 * 60 * 1000)) return fail(url, "google_failed");

  const flow = decodeFlow(req.cookies.get(GOOGLE_FLOW_COOKIE)?.value);
  if (!flow) return fail(url, "google_expired");

  if (url.searchParams.get("error")) return fail(url, "google_cancelled", flow.from);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  if (!code || !sameString(state, flow.state)) return fail(url, "google_expired", flow.from);

  let idToken: string | undefined;
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: new URL(GOOGLE_CALLBACK_PATH, url).toString(),
        grant_type: "authorization_code",
        code_verifier: flow.verifier,
      }),
      cache: "no-store",
    });
    const body = await tokenRes.json().catch(() => null);
    if (!tokenRes.ok) console.error("google token exchange failed", tokenRes.status, body?.error);
    idToken = tokenRes.ok && typeof body?.id_token === "string" ? body.id_token : undefined;
  } catch (err) {
    console.error("google token exchange error", err);
  }
  if (!idToken) return fail(url, "google_failed", flow.from);

  const claims = checkIdToken(idToken, cfg.clientId, flow.nonce);
  if (!claims.ok) {
    console.error("google id token rejected", claims.reason);
    return fail(url, "google_failed", flow.from);
  }

  const { data, error } = await db()
    .from("team_members")
    .select("id, password_hash, active")
    .eq("email", claims.email)
    .maybeSingle<{ id: string; password_hash: string; active: boolean }>();
  if (error) {
    console.error("ops google login lookup failed", error);
    return fail(url, "google_failed", flow.from);
  }
  if (!data?.active) return fail(url, "google_no_account", flow.from);

  const res = NextResponse.redirect(new URL(flow.from, url));
  res.cookies.set(OPS_COOKIE_NAME, await createTeamToken(secret, data.id, data.password_hash), OPS_COOKIE_OPTIONS);
  res.cookies.set(GOOGLE_FLOW_COOKIE, "", { path: "/api/ops/auth/google", maxAge: 0 });
  await db().from("team_members").update({ last_login_at: new Date().toISOString() }).eq("id", data.id);
  return res;
}
