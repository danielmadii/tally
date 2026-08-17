import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key. All authorization
 * is enforced in our API layer against the session (role + shop scope);
 * RLS keeps the anon key useless as defence in depth.
 */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase is not configured. Copy .env.example to .env.local and fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
