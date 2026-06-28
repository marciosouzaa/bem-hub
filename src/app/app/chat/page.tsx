import {
  getEntitlements,
  getMonthlyAssistantMessageCount,
  hasFeature,
} from "@/features/billing/entitlements";
import { UpgradeCTA } from "@/features/billing/upgrade-cta";
import { ChatWorkspace } from "@/features/chat/chat-workspace";
import {
  getConversation,
  listConversationMessages,
  listConversations,
} from "@/features/chat/queries";
import { listAssistants } from "@/features/assistants/queries";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const workspace = await getRequiredWorkspace();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const organizationId = workspace.organization.id;
  const entitlements = await getEntitlements(supabase, organizationId);

  if (!hasFeature(entitlements, "chat")) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        <UpgradeCTA
          description={`O módulo de conversas não está liberado para o plano ${entitlements.plan.name}. Atualize o plano para ativar este fluxo no workspace.`}
          feature="chat"
          planName={entitlements.plan.name}
          title="Chat indisponível neste plano"
        />
      </div>
    );
  }

  const conversations = await listConversations(supabase, organizationId);
  const assistants = await listAssistants(supabase, organizationId);
  const monthlyUsage = await getMonthlyAssistantMessageCount(
    supabase,
    organizationId,
  );
  const requestedConversationId = params.conversationId;
  const currentConversation = requestedConversationId
    ? await getConversation(supabase, organizationId, requestedConversationId)
    : null;
  const messages = currentConversation
    ? await listConversationMessages(
        supabase,
        organizationId,
        currentConversation.id,
      )
    : [];

  return (
    <ChatWorkspace
      assistants={assistants}
      conversations={conversations}
      currentAssistantId={currentConversation?.assistantId ?? null}
      currentConversationId={currentConversation?.id ?? null}
      initialMessages={messages}
      key={currentConversation?.id ?? "new"}
      monthlyLimit={entitlements.plan.limits.monthlyMessages}
      monthlyUsage={monthlyUsage}
    />
  );
}
