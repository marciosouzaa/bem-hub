import "server-only";

import {
  channelProviderStatusSchema,
  type ChannelProviderStatus,
} from "@/features/channels/channel-provider-schema";
import type { ManagedChannelActionResult } from "@/features/channels/managed/managed-channel-contracts";
import { ManagedProvisioningDatabaseError } from "@/features/channels/managed/managed-channel-errors";
import { ChannelProviderRequestError } from "@/features/channels/providers/provider-http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function getCurrentProvisioningResult(input: {
  admin: AdminClient;
  channelId: string;
  organizationId: string;
  runId: string;
}): Promise<ManagedChannelActionResult> {
  const { data, error } = await input.admin
    .from("channel_connections")
    .select("status")
    .eq("id", input.channelId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (error || !data) throw new ManagedProvisioningDatabaseError();

  const status = channelProviderStatusSchema.safeParse(data.status);
  return {
    channelId: input.channelId,
    message: data.status === "connected"
      ? "WhatsApp já conectado."
      : "O provisionamento desta conexão já está em andamento.",
    ok: true,
    runId: input.runId,
    status: status.success ? status.data : "provisioning",
  };
}

export async function updateManagedRunStep(input: {
  admin: AdminClient;
  organizationId: string;
  runId: string;
  step: string;
}) {
  const { error } = await input.admin
    .from("channel_provisioning_runs")
    .update({
      lease_expires_at: new Date(Date.now() + 120_000).toISOString(),
      step: input.step,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.runId)
    .eq("organization_id", input.organizationId);
  if (error) throw new ManagedProvisioningDatabaseError();
}

export async function finishManagedProvisioningRun(input: {
  admin: AdminClient;
  organizationId: string;
  runId: string;
  status: ChannelProviderStatus;
}) {
  const connected = input.status === "connected";
  const { error } = await input.admin
    .from("channel_provisioning_runs")
    .update({
      finished_at: connected ? new Date().toISOString() : null,
      lease_expires_at: null,
      status: connected ? "succeeded" : "awaiting_pairing",
      step: connected ? "connected" : "awaiting_pairing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.runId)
    .eq("organization_id", input.organizationId);
  if (error) throw new ManagedProvisioningDatabaseError();
}

export async function markManagedProvisioningFailed(input: {
  admin: AdminClient;
  channelId: string;
  error: unknown;
  message: string;
  organizationId: string;
  runId: string;
}) {
  const now = new Date().toISOString();
  const errorCode = input.error instanceof ChannelProviderRequestError
    ? `provider_http_${input.error.status ?? "network"}`
    : "managed_provisioning_failed";
  await Promise.all([
    input.admin
      .from("channel_provisioning_runs")
      .update({
        error_code: errorCode,
        error_message: input.message.slice(0, 500),
        finished_at: now,
        lease_expires_at: null,
        status: "failed",
        step: "failed",
        updated_at: now,
      })
      .eq("id", input.runId)
      .eq("organization_id", input.organizationId),
    input.admin
      .from("channel_connections")
      .update({ status: "failed", status_reason: input.message })
      .eq("id", input.channelId)
      .eq("organization_id", input.organizationId),
  ]);
}
