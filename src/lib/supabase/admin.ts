import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getSupabaseUrl } from "@/lib/supabase/config";

export class SupabaseAdminConfigError extends Error {
  constructor() {
    super("SUPABASE_SECRET_KEY não configurada.");
    this.name = "SupabaseAdminConfigError";
  }
}

export function createSupabaseAdminClient() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) throw new SupabaseAdminConfigError();

  return createClient<Database>(getSupabaseUrl(), secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
