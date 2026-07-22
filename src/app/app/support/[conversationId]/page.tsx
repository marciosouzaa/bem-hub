import { getRequiredWorkspace } from "@/features/organizations/queries";
import { getSupportConversation } from "@/features/support/queries";
import { SupportConversationView } from "@/features/support/support-conversation-view";

export default async function SupportConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const workspace = await getRequiredWorkspace();
  const { conversationId } = await params;
  const conversation = await getSupportConversation(
    workspace.organization.id,
    conversationId,
  );

  return <SupportConversationView conversation={conversation} />;
}
