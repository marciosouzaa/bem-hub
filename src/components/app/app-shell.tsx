import { getRequiredWorkspace } from "@/features/organizations/queries";
import { WorkspaceShell } from "@/components/app/workspace-shell";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const workspace = await getRequiredWorkspace();
  const firstName = workspace.profile.name?.split(" ")[0] || workspace.profile.email?.split("@")[0] || "Operador";

  return <WorkspaceShell
    email={workspace.profile.email}
    name={firstName}
    organization={workspace.organization.name}
    role={workspace.membership.role}
  >{children}</WorkspaceShell>;
}
