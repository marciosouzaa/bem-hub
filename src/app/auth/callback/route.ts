import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLoginPath, sanitizeInternalPath } from "@/lib/navigation";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeInternalPath(requestUrl.searchParams.get("next"));

  if (!code) {
    redirect(getLoginPath(next));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    redirect(getLoginPath(next));
  }

  redirect(next);
}
