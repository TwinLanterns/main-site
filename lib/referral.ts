"use client";

// Shared by the three Earn sign-up flows (apply, GoPro, speech). A `?ref=`
// code is remembered for REF_TTL_MS so an applicant who clicks an
// ambassador's link and comes back later is still credited — but not
// forever, and it's cleared once a sign-up using it succeeds.

const REF_KEY = "tl-earn-ref";
const LEGACY_REF_KEY = "tl-earn-ref-code";
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Reads `?ref=` (storing it) or a still-fresh stored code. Call after mount. */
export function loadReferralCode(): string | null {
  try {
    // Pre-TTL entries have no timestamp, so their age is unknown — drop them.
    localStorage.removeItem(LEGACY_REF_KEY);

    const ref = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (ref) {
      localStorage.setItem(REF_KEY, JSON.stringify({ code: ref, at: Date.now() }));
      return ref;
    }

    const saved = localStorage.getItem(REF_KEY);
    if (!saved) return null;
    const { code, at } = JSON.parse(saved) as { code?: unknown; at?: unknown };
    if (
      typeof code === "string" &&
      typeof at === "number" &&
      Date.now() - at < REF_TTL_MS
    ) {
      return code;
    }
    localStorage.removeItem(REF_KEY);
  } catch {
    // Storage unavailable or corrupt — no referral.
  }
  return null;
}

/** Forget the referral once a sign-up has been credited with it. */
export function clearReferralCode(): void {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {}
}
