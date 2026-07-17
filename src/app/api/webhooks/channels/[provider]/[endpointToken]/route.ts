import { z } from "zod";

import {
  channelProviderSchema,
} from "@/features/channels/channel-provider-schema";
import {
  ChannelWebhookVerificationError,
} from "@/features/channels/webhooks/contracts";
import {
  webhookEndpointTokenSchema,
} from "@/features/channels/webhooks/endpoint-token";
import {
  ChannelWebhookEndpointNotFoundError,
  ChannelWebhookProviderUnsupportedError,
  processChannelWebhook,
} from "@/features/channels/webhooks/process-channel-webhook";

const MAX_WEBHOOK_BYTES = 512 * 1024;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/webhooks/channels/[provider]/[endpointToken]">,
) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "json_required" }, { status: 415 });
  }

  const { endpointToken: rawToken, provider: rawProvider } = await context.params;
  const provider = channelProviderSchema.safeParse(rawProvider);
  const endpointToken = webhookEndpointTokenSchema.safeParse(rawToken);
  if (!provider.success || !endpointToken.success) {
    return Response.json({ error: "webhook_not_found" }, { status: 404 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await processChannelWebhook({
      endpointToken: endpointToken.data,
      headers: request.headers,
      payload,
      provider: provider.data,
      rawBody,
    });
    if (result.failed > 0) {
      return Response.json({ error: "processing_failed" }, { status: 503 });
    }
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ChannelWebhookEndpointNotFoundError) {
      return Response.json({ error: "webhook_not_found" }, { status: 404 });
    }
    if (error instanceof ChannelWebhookVerificationError) {
      return Response.json({ error: "webhook_not_authenticated" }, { status: 401 });
    }
    if (error instanceof ChannelWebhookProviderUnsupportedError) {
      return Response.json({ error: "provider_not_supported" }, { status: 422 });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ error: "invalid_provider_payload" }, { status: 400 });
    }
    return Response.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}

