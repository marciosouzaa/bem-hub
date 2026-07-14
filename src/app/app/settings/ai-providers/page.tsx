import { ConnectionsWorkspace } from "@/features/ai-provider-connections/connections-workspace";
import { listAiProviderConnections } from "@/features/ai-provider-connections/queries";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AiProvidersPage() {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const connections = await listAiProviderConnections(supabase, workspace.organization.id);
  const canManage = workspace.membership.role === "owner" || workspace.membership.role === "admin";

  return <ConnectionsWorkspace canManage={canManage} connections={connections} />;
}
