import { NextResponse } from "next/server";

/**
 * Best-effort fixed-window rate limiter, keyed by client IP + bucket name.
 *
 * State lives in process memory, so on serverless each warm instance counts
 * separately. That still blunts scripted abuse from a single client, but
 * isn't a hard global limit — back it with a shared store (Redis, Upstash,
 * Vercel WAF) if you need one.
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

/** Returns a 429 response when the caller is over `limit`, otherwise null. */
export function rateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now();
  const key = `${bucket}:${clientIp(req)}`;
  let w = windows.get(key);

  if (!w || w.resetAt <= now) {
    prune(now);
    w = { count: 0, resetAt: now + windowMs };
    windows.set(key, w);
  }

  w.count += 1;
  if (w.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((w.resetAt - now) / 1000));
  return NextResponse.json(
    { ok: false, error: "Too many requests — please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
