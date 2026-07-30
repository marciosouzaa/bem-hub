import type {
  ChannelProvider,
  ChannelProviderCredentials,
  ChannelProviderStatus,
} from "@/features/channels/channel-provider-schema";
import type {
  ChannelMessageEvent,
  ChannelWebhookConfiguration,
  ChannelWebhookRequest,
} from "@/features/channels/webhooks/contracts";

export type ChannelProviderHealth = {
  externalInstanceId: string | null;
  phoneNumber?: string | null;
  reason: string | null;
  status: ChannelProviderStatus;
};

export type ChannelWebhookHealth = {
  healthy: boolean;
  reason: string | null;
};

export type ChannelPairing =
  | { kind: "code"; value: string }
  | { kind: "none"; value: null }
  | { kind: "qr"; value: string };

export type PairingInput = {
  method: "pin" | "qr";
  phoneNumber: string;
};

export type ChannelTextMessageInput = {
  recipient: string;
  text: string;
  trackingId: string;
};

export type ChannelTextMessageResult = {
  externalMessageId: string;
};

export interface ChannelProviderAdapter {
  configureWebhook?(input: ChannelWebhookConfiguration): Promise<void>;
  disconnect(): Promise<void>;
  getHealth(): Promise<ChannelProviderHealth>;
  getWebhookHealth?(
    input: ChannelWebhookConfiguration,
  ): Promise<ChannelWebhookHealth>;
  provision?(): Promise<void>;
  provider: ChannelProvider;
  requestPairing(input: PairingInput): Promise<ChannelPairing>;
  sendTextMessage?(
    input: ChannelTextMessageInput,
  ): Promise<ChannelTextMessageResult>;
  verifyAndNormalizeWebhook?(
    input: ChannelWebhookRequest,
  ): Promise<ChannelMessageEvent[]> | ChannelMessageEvent[];
}

export type ChannelProviderAdapterFactory = (
  credentials: ChannelProviderCredentials,
) => ChannelProviderAdapter;
