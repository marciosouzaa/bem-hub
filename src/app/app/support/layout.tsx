import { listChannelConnections } from "@/features/channels/channel-queries";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { listSupportInbox } from "@/features/support/queries";
import { SupportInboxShell } from "@/features/support/support-inbox-shell";
import { SupportRealtimeListener } from "@/features/support/support-realtime-listener";

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getRequiredWorkspace();
  const [channels, conversations] = await Promise.all([
    listChannelConnections(workspace.organization.id),
    listSupportInbox(workspace.organization.id),
  ]);

  return (
    <>
      <SupportRealtimeListener organizationId={workspace.organization.id} />
      <SupportInboxShell
        channels={channels}
        conversations={conversations}
        viewerId={workspace.user.id}
      >
        {children}
      </SupportInboxShell>
    </>
  );
}
