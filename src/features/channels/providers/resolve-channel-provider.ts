import type { ChannelProviderCredentials } from "@/features/channels/channel-provider-schema";
import type { ChannelProviderAdapter } from "@/features/channels/providers/channel-provider-adapter";
import { createUazapiAdapter } from "@/features/channels/providers/uazapi/uazapi-adapter";
import { createZApiAdapter } from "@/features/channels/providers/z-api/z-api-adapter";

export function resolveChannelProvider(
  credentials: ChannelProviderCredentials,
): ChannelProviderAdapter {
  if (credentials.provider === "uazapi") return createUazapiAdapter(credentials);
  return createZApiAdapter(credentials);
}
