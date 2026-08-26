export function getInvitationAcceptanceResultPath(
  accepted: boolean,
  firstAccess = false,
) {
  if (accepted && firstAccess) {
    return "/auth/invitation-accepted?status=accepted&first_access=1";
  }

  return accepted
    ? "/auth/invitation-accepted?status=accepted"
    : "/auth/invitation-accepted?status=error";
}
