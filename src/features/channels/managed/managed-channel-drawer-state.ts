import type { ChannelProviderStatus } from "@/features/channels/channel-provider-schema";
import type { ChannelConnection } from "@/features/channels/channel-schema";
import type { ChannelPairing } from "@/features/channels/providers/channel-provider-adapter";

export type ManagedChannelDrawerState = {
  actionError: string | null;
  connectionId: string | null;
  feedback: string | null;
  operating: boolean;
  pairing: ChannelPairing | null;
  requestId: string;
  status: ChannelProviderStatus;
};

export function createManagedChannelDrawerState(
  channel: ChannelConnection | null,
): ManagedChannelDrawerState {
  return {
    actionError: null,
    connectionId: channel?.id ?? null,
    feedback: null,
    operating: false,
    pairing: null,
    requestId: channel?.managedRequestId ?? crypto.randomUUID(),
    status: channel?.status ?? "draft",
  };
}

export function managedChannelDrawerReducer(
  state: ManagedChannelDrawerState,
  patch: Partial<ManagedChannelDrawerState>,
) {
  return { ...state, ...patch };
}
