import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

/** Solo per job amministrativi fidati. Non importare mai questo modulo nei Client Components. */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurata sul server.");
  }
  const { url } = getSupabaseConfig();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
