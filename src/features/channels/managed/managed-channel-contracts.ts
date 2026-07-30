import type { ChannelProviderStatus } from "@/features/channels/channel-provider-schema";
import type { ChannelPairing } from "@/features/channels/providers/channel-provider-adapter";

export type ManagedChannelActionResult =
  | {
      channelId: string;
      message: string;
      ok: true;
      pairing?: ChannelPairing;
      runId: string;
      status: ChannelProviderStatus;
    }
  | { message: string; ok: false };

export type ManagedChannelRegistration = {
  channelId: string;
  created: boolean;
  runId: string;
  runStatus:
    | "awaiting_pairing"
    | "failed"
    | "in_progress"
    | "queued"
    | "succeeded";
};
