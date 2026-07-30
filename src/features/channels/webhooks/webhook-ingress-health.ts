import type { ChannelProvider } from "@/features/channels/channel-provider-schema";
import type { ChannelProviderAdapter } from "@/features/channels/providers/channel-provider-adapter";
import { getAppBaseUrl } from "@/lib/app-url";

export const webhookIngressHealthHeader = "x-bem-hub-webhook-ingress";
export const webhookIngressHealthValue = "ready";

const ingressHealthPath = "/api/health/webhook-ingress";
const ingressTimeoutMs = 5_000;

export class ChannelWebhookIngressUnavailableError extends Error {
  constructor() {
    super("O endereço público de recebimento não está acessível.");
    this.name = "ChannelWebhookIngressUnavailableError";
  }
}

export async function assertWebhookIngressReachable(
  appBaseUrl = getAppBaseUrl(),
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(`${appBaseUrl}${ingressHealthPath}`, {
      cache: "no-store",
      method: "GET",
      signal: AbortSignal.timeout(ingressTimeoutMs),
    });
  } catch {
    throw new ChannelWebhookIngressUnavailableError();
  }

  if (
    response.status !== 204
    || response.headers.get(webhookIngressHealthHeader)
      !== webhookIngressHealthValue
  ) {
    throw new ChannelWebhookIngressUnavailableError();
  }
}

export async function reconcileProviderWebhook(input: {
  adapter: ChannelProviderAdapter;
  appBaseUrl?: string;
  endpointToken: string;
  ingressFetcher?: typeof fetch;
  provider: ChannelProvider;
}) {
  const appBaseUrl = input.appBaseUrl ?? getAppBaseUrl();
  await assertWebhookIngressReachable(appBaseUrl, input.ingressFetcher);

  if (!input.adapter.configureWebhook) {
    throw new Error("O provedor não permite configurar recebimento.");
  }

  const url =
    `${appBaseUrl}/api/webhooks/channels/${input.provider}/${input.endpointToken}`;
  const current = await input.adapter.getWebhookHealth?.({ url });
  if (current?.healthy) {
    return { reconfigured: false, url };
  }

  await input.adapter.configureWebhook({ url });
  return { reconfigured: true, url };
}
