import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. Uses the service role key, which bypasses
 * Row Level Security — never import this file from a "use client" component
 * or expose SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
 */
export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run `vercel env pull .env.local` " +
        "to sync the values the Supabase-Vercel integration set up, or check " +
        "Vercel → Settings → Environment Variables for the exact names.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
