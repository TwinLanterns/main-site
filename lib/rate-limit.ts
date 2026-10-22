import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Fixed-window rate limiter, keyed by client IP + bucket name.
 *
 * Counts live in Postgres (supabase/rate_limits.sql → rate_limit_hit), so
 * the limit holds across serverless instances and cold starts. If that call
 * fails (migration not applied, DB hiccup) it falls back to a per-instance
 * in-memory window rather than failing the request.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function prune(now: number) {
  if (windows.size < MAX_TRACKED_KEYS) return;
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
  // Still full of live windows: drop the oldest entries to bound memory.
  if (windows.size >= MAX_TRACKED_KEYS) {
    const excess = windows.size - MAX_TRACKED_KEYS + 1;
    let i = 0;
    for (const key of windows.keys()) {
      if (i++ >= excess) break;
      windows.delete(key);
    }
  }
}

function hitInMemory(key: string, windowMs: number): Window {
  const now = Date.now();
  let w = windows.get(key);
  if (!w || w.resetAt <= now) {
    prune(now);
    w = { count: 0, resetAt: now + windowMs };
    windows.set(key, w);
  }
  w.count += 1;
  return w;
}

async function hit(key: string, windowMs: number): Promise<Window> {
  try {
    const { data, error } = await getSupabaseServerClient()
      .rpc("rate_limit_hit", { p_key: key, p_window_ms: windowMs })
      .single<{ hits: number; reset_at: string }>();
    if (error || !data) throw error ?? new Error("empty rate limit result");
    return { count: data.hits, resetAt: new Date(data.reset_at).getTime() };
  } catch (err) {
    console.error("shared rate limit unavailable, using in-memory", err);
    return hitInMemory(key, windowMs);
  }
}

/** Returns a 429 response when `key` is over `limit`, otherwise null. */
export async function rateLimitKey(
  key: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const w = await hit(key, windowMs);
  if (w.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((w.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { ok: false, error: "Too many requests — please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** Returns a 429 response when the caller's IP is over `limit`, otherwise null. */
export function rateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  return rateLimitKey(`${bucket}:${clientIp(req)}`, limit, windowMs);
}
