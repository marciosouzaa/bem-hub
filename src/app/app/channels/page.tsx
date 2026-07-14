import { PageLayout } from "@/components/app";
import { listChannelConnections } from "@/features/channels/channel-queries";
import { ChannelsWorkspace } from "@/features/channels/channels-workspace";
import { getRequiredWorkspace } from "@/features/organizations/queries";

export default async function ChannelsPage() {
  const workspace = await getRequiredWorkspace();
  const channels = await listChannelConnections(workspace.organization.id);
  const canManage = workspace.membership.role === "owner" || workspace.membership.role === "admin";

  return (
    <PageLayout className="space-y-7" size="wide">
      <ChannelsWorkspace canManage={canManage} channels={channels} />
    </PageLayout>
  );
}
