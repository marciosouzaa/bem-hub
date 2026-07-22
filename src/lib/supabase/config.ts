export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? missingSupabaseUrl();
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    missingSupabaseKey()
  );
}

function missingSupabaseUrl(): never {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

function missingSupabaseKey(): never {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}
