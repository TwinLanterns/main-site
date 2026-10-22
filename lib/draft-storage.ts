"use client";

// Wizard drafts hold contact details (name, email, phone), so they expire
// instead of sitting in localStorage forever on shared or school computers.
// Used by lib/useDraftState.ts and the Earn sign-up flows.

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Stored<T> = { data: T; savedAt: number };

/** Returns the saved draft, or null if missing, corrupt or expired. */
export function readDraft<T>(key: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored<T>>;
    // Drafts saved before the TTL existed have no timestamp; their age is
    // unknown, so treat them as expired.
    if (
      typeof parsed?.savedAt !== "number" ||
      Date.now() - parsed.savedAt > DRAFT_TTL_MS
    ) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, data: T): void {
  try {
    const stored: Stored<T> = { data, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(stored));
  } catch {}
}
