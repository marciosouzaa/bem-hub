import { getRequiredWorkspace } from "@/features/organizations/queries";
import { SupportRealtimeListener } from "@/features/support/support-realtime-listener";

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getRequiredWorkspace();

  return (
    <>
      <SupportRealtimeListener organizationId={workspace.organization.id} />
      {children}
    </>
  );
}
