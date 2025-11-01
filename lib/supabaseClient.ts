import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser (public) Supabase client.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Created lazily and stored on globalThis to survive HMR in development.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

let supabaseBrowser: SupabaseClient | null = null;

if (typeof window !== "undefined") {
  if (!supabaseUrl || !supabaseAnonKey) {
    // eslint-disable-next-line no-console
    console.warn("Supabase browser client created without NEXT_PUBLIC keys set.");
  }

  // Use a global to avoid multiple clients during HMR
  const g = globalThis as any;
  if (!g.__supabase) {
    g.__supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
  }
  supabaseBrowser = g.__supabase as SupabaseClient;
}

export function getBrowserSupabaseClient(): SupabaseClient | null {
  return supabaseBrowser;
}

/**
 * Server-side Supabase client factory.
 * Use this only in server-side code (API routes, server actions, or files that run on the server).
 * It uses SUPABASE_SERVICE_ROLE_KEY which must never be exposed to the browser.
 */
export function createServerSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "Missing SUPABASE environment variables for server client. Ensure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are set."
    );
  }
  return createClient(url, serviceRole);
}

export default {
  getBrowserSupabaseClient,
  createServerSupabaseClient,
};
