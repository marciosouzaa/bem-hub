export const SUPPORT_REALTIME_EVENT = "support.inbox.changed";

export function getSupportRealtimeTopic(organizationId: string) {
  return `org:${organizationId}:support`;
}
