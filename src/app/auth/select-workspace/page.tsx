import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceSelectionPanel } from "@/app/auth/select-workspace/workspace-selection-panel";
import {
  ensureUserProfile,
  listUserWorkspaceOptions,
} from "@/features/organizations/bootstrap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SelectWorkspacePageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function SelectWorkspacePage({
  searchParams,
}: SelectWorkspacePageProps) {
  const params = await searchParams;
  const next = sanitizeNext(params?.next);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  await ensureUserProfile(supabase, user);
  const workspaces = await listUserWorkspaceOptions(supabase, user.id);

  if (workspaces.length === 0) {
    redirect("/app");
  }

  if (workspaces.length === 1) {
    redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            BH
          </span>
          <span className="text-lg font-semibold">BEM HUB</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Escolha a conta</CardTitle>
            <p className="text-sm leading-6 text-muted">
              Seu usuario tem acesso a mais de uma conta. Selecione o workspace
              operacional antes de continuar.
            </p>
          </CardHeader>
          <CardContent>
            <WorkspaceSelectionPanel
              next={next}
              workspaces={workspaces.map((workspace) => ({
                organization: {
                  id: workspace.organization.id,
                  name: workspace.organization.name,
                  slug: workspace.organization.slug,
                },
                role: workspace.role,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function sanitizeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/app";
  }

  return next;
}
