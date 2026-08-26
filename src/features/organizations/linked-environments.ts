import type { WorkspaceOption } from "@/features/organizations/bootstrap";

export type LinkedEnvironment = {
  id: string;
  isCurrent: boolean;
  name: string;
  role: WorkspaceOption["role"];
  slug: string;
};

export function getLinkedEnvironments(
  workspaces: WorkspaceOption[],
  currentOrganizationId: string,
): LinkedEnvironment[] {
  return workspaces.map((workspace) => ({
    id: workspace.organization.id,
    isCurrent: workspace.organization.id === currentOrganizationId,
    name: workspace.organization.name,
    role: workspace.role,
    slug: workspace.organization.slug,
  }));
}

export function canUnlinkLinkedEnvironment(environment: LinkedEnvironment) {
  return environment.role !== "owner";
}
