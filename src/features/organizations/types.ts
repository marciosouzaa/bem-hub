export type OrganizationRole = "owner" | "admin" | "member";

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: "active" | "invited" | "removed";
};
