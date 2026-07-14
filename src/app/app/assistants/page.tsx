import { PageLayout } from "@/components/app";
import { listAiProviderConnections } from "@/features/ai-provider-connections/queries";
import { listAssistants } from "@/features/assistants/queries";
import { AssistantsWorkspace } from "@/features/assistants/assistants-workspace";
import { getEntitlements, hasFeature } from "@/features/billing/entitlements";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AssistantsPage() {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const [entitlements, assistants, connections] = await Promise.all([
    getEntitlements(supabase, workspace.organization.id),
    listAssistants(supabase, workspace.organization.id),
    listAiProviderConnections(supabase, workspace.organization.id),
  ]);
  const featureEnabled = hasFeature(entitlements, "assistants");
  const canManage = featureEnabled && (workspace.membership.role === "owner" || workspace.membership.role === "admin");

  return (
    <PageLayout size="wide">
      <AssistantsWorkspace
        assistants={assistants}
        canManage={canManage}
        connections={connections}
        featureEnabled={featureEnabled}
        planName={entitlements.plan.name}
      />
    </PageLayout>
  );
}
