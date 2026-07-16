import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

export function createPublicServerClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
