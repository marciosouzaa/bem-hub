import type { ChannelProviderCredentials } from "@/features/channels/channel-provider-schema";
import type { ChannelProviderAdapter } from "@/features/channels/providers/channel-provider-adapter";
import { createEvolutionAdapter } from "@/features/channels/providers/evolution/evolution-adapter";
import { createUazapiAdapter } from "@/features/channels/providers/uazapi/uazapi-adapter";
import { createWuzapiAdapter } from "@/features/channels/providers/wuzapi/wuzapi-adapter";
import { createZApiAdapter } from "@/features/channels/providers/z-api/z-api-adapter";

export function resolveChannelProvider(
  credentials: ChannelProviderCredentials,
): ChannelProviderAdapter {
  if (credentials.provider === "uazapi") return createUazapiAdapter(credentials);
  if (credentials.provider === "z_api") return createZApiAdapter(credentials);
  if (credentials.provider === "evolution") return createEvolutionAdapter(credentials);
  return createWuzapiAdapter(credentials);
}
