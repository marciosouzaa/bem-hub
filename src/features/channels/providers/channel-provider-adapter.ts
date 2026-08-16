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
  replyTo?: ChannelMessageReference;
};

export type ChannelTextMessageResult = {
  externalMessageId: string;
};

/**
 * Provider-neutral reference to a WhatsApp message in the current contact
 * conversation. The delivery layer owns authorization before exposing this
 * reference to a provider adapter.
 */
export type ChannelMessageReference = {
  direction: "inbound" | "outbound";
  externalMessageId: string;
};

export type ChannelMessageReactionInput = {
  emoji: string;
  recipient: string;
  target: ChannelMessageReference;
};

export type ChannelMediaType = "audio" | "document" | "image" | "video";

export type ChannelInboundMediaDownload = {
  dataBase64: string;
  fileName: string | null;
  mimeType: string;
  mediaType: ChannelMediaType;
};

export type ChannelContactProfilePicture = {
  avatarUrl: string | null;
};

/** Binary content is accepted only inside the server delivery boundary. */
export type ChannelMediaMessageInput = {
  caption?: string;
  dataUrl: string;
  fileName?: string;
  mediaType: ChannelMediaType;
  mimeType: string;
  recipient: string;
  replyTo?: ChannelMessageReference;
  trackingId: string;
};

export interface ChannelProviderAdapter {
  configureWebhook?(input: ChannelWebhookConfiguration): Promise<void>;
  disconnect(): Promise<void>;
  downloadInboundMedia?(input: { downloadContext: unknown }): Promise<ChannelInboundMediaDownload>;
  getContactProfilePicture?(
    input: { phone: string },
  ): Promise<ChannelContactProfilePicture>;
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
  sendReaction?(input: ChannelMessageReactionInput): Promise<void>;
  sendMediaMessage?(
    input: ChannelMediaMessageInput,
  ): Promise<ChannelTextMessageResult>;
  verifyAndNormalizeWebhook?(
    input: ChannelWebhookRequest,
  ): Promise<ChannelMessageEvent[]> | ChannelMessageEvent[];
}

export type ChannelProviderAdapterFactory = (
  credentials: ChannelProviderCredentials,
) => ChannelProviderAdapter;
