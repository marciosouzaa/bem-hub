import { describe, expect, test } from "bun:test";

import type { WorkspaceOption } from "@/features/organizations/bootstrap";
import {
  canUnlinkLinkedEnvironment,
  getLinkedEnvironments,
} from "@/features/organizations/linked-environments";
import { getWorkspaceNavigation } from "@/features/organizations/workspace-navigation";

const workspaces: WorkspaceOption[] = [
  {
    organization: {
      id: "owner-organization",
      name: "Conta responsavel",
      ownerId: "user-id",
      slug: "conta-responsavel",
    },
    role: "owner",
  },
  {
    organization: {
      id: "team-organization",
      name: "Conta convidada",
      ownerId: "another-user-id",
      slug: "conta-convidada",
    },
    role: "member",
  },
];

describe("workspace navigation", () => {
  test("selects the only active environment for cookie persistence", () => {
    expect(getWorkspaceNavigation([workspaces[0]])).toEqual({
      kind: "single",
      organizationId: "owner-organization",
    });
  });

  test("requires selection for multiple active environments", () => {
    expect(getWorkspaceNavigation(workspaces)).toEqual({ kind: "multiple" });
  });

  test("maps only supplied active environments and marks the current one", () => {
    expect(getLinkedEnvironments(workspaces, "team-organization")).toEqual([
      {
        id: "owner-organization",
        isCurrent: false,
        name: "Conta responsavel",
        role: "owner",
        slug: "conta-responsavel",
      },
      {
        id: "team-organization",
        isCurrent: true,
        name: "Conta convidada",
        role: "member",
        slug: "conta-convidada",
      },
    ]);
  });

  test("allows self-unlink only for invited account memberships", () => {
    const environments = getLinkedEnvironments(workspaces, "team-organization");

    expect(canUnlinkLinkedEnvironment(environments[0])).toBe(false);
    expect(canUnlinkLinkedEnvironment(environments[1])).toBe(true);
    expect(canUnlinkLinkedEnvironment({ ...environments[1], role: "admin" })).toBe(true);
  });
});
