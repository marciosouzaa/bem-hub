import { redirect } from "next/navigation";
import { cache } from "react";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getRequiredWorkspace = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return getOrCreateWorkspace(supabase, { user });
});
