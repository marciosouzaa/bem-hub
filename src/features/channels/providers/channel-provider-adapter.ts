import type {
  ChannelProvider,
  ChannelProviderCredentials,
  ChannelProviderStatus,
} from "@/features/channels/channel-provider-schema";

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
  disconnect(): Promise<void>;
  getHealth(): Promise<ChannelProviderHealth>;
  provider: ChannelProvider;
  requestPairing(input: PairingInput): Promise<ChannelPairing>;
}

export type ChannelProviderAdapterFactory = (
  credentials: ChannelProviderCredentials,
) => ChannelProviderAdapter;
