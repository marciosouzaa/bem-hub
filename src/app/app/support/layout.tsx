import { getRequiredWorkspace } from "@/features/organizations/queries";
import {
  getSupportMetrics,
  listSupportInbox,
} from "@/features/support/queries";
import { SupportInboxShell } from "@/features/support/support-inbox-shell";
import { SupportRealtimeListener } from "@/features/support/support-realtime-listener";

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getRequiredWorkspace();
  const [conversations, metrics] = await Promise.all([
    listSupportInbox(workspace.organization.id),
    getSupportMetrics(workspace.organization.id),
  ]);

  return (
    <>
      <SupportRealtimeListener organizationId={workspace.organization.id} />
      <SupportInboxShell
        conversations={conversations}
        metrics={metrics}
        viewerId={workspace.user.id}
      >
        {children}
      </SupportInboxShell>
    </>
  );
}
