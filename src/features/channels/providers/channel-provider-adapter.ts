import type {
  ChannelProvider,
  ChannelProviderCredentials,
  ChannelProviderStatus,
} from "@/features/channels/channel-provider-schema";
import type {
  ChannelInboundMessageEvent,
  ChannelWebhookConfiguration,
  ChannelWebhookRequest,
} from "@/features/channels/webhooks/contracts";

export type ChannelProviderHealth = {
  externalInstanceId: string | null;
  reason: string | null;
  status: ChannelProviderStatus;
};

export type ChannelPairing =
  | { kind: "code"; value: string }
  | { kind: "none"; value: null }
  | { kind: "qr"; value: string };

export type PairingInput = {
  method: "pin" | "qr";
  phoneNumber: string;
};

export interface ChannelProviderAdapter {
  configureWebhook?(input: ChannelWebhookConfiguration): Promise<void>;
  disconnect(): Promise<void>;
  getHealth(): Promise<ChannelProviderHealth>;
  provider: ChannelProvider;
  requestPairing(input: PairingInput): Promise<ChannelPairing>;
  verifyAndNormalizeWebhook?(
    input: ChannelWebhookRequest,
  ): Promise<ChannelInboundMessageEvent[]> | ChannelInboundMessageEvent[];
}

export type ChannelProviderAdapterFactory = (
  credentials: ChannelProviderCredentials,
) => ChannelProviderAdapter;
