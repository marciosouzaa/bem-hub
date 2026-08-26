import type { WorkspaceOption } from "@/features/organizations/bootstrap";

export type WorkspaceNavigation =
  | { kind: "none" }
  | { kind: "single"; organizationId: string }
  | { kind: "multiple" };

export function getWorkspaceNavigation(
  workspaces: WorkspaceOption[],
): WorkspaceNavigation {
  if (workspaces.length === 0) {
    return { kind: "none" };
  }

  if (workspaces.length === 1) {
    return {
      kind: "single",
      organizationId: workspaces[0].organization.id,
    };
  }

  return { kind: "multiple" };
}
