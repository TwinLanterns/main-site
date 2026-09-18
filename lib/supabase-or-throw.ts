import { getSupabaseServerClient } from "@/lib/supabase-server";

// Shared by every module that needs a Supabase client and wants a
// domain-specific config error instead of letting getSupabaseServerClient's
// own error leak out (lib/submissions/persistence.ts, partner-persistence.ts,
// lib/verification/store.ts).
export function getSupabaseOrThrow<E extends Error>(
  makeError: (err: unknown) => E,
): ReturnType<typeof getSupabaseServerClient> {
  try {
    return getSupabaseServerClient();
  } catch (err) {
    console.error("supabase config error", err);
    throw makeError(err);
  }
}
