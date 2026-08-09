"use server";

import { revalidatePath } from "next/cache";

import {
  getManagedChannelConfig,
} from "@/features/channels/managed/managed-channel-config";
import type { ManagedChannelActionResult } from "@/features/channels/managed/managed-channel-contracts";
import {
  managedProvisioningDatabaseErrorResult,
  managedProvisioningErrorResult,
} from "@/features/channels/managed/managed-channel-errors";
import {
  getCurrentProvisioningResult,
} from "@/features/channels/managed/managed-channel-run-store";
import {
  managedChannelInputSchema,
  managedChannelRegistrationSchema,
} from "@/features/channels/managed/managed-channel-schema";
import { provisionManagedEvolution } from "@/features/channels/managed/provision-managed-evolution";
import { provisionManagedWuzapi } from "@/features/channels/managed/provision-managed-wuzapi";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { getAppBaseUrl } from "@/lib/app-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const channelsPath = "/app/channels";

export async function provisionManagedChannelAction(
  input: unknown,
): Promise<ManagedChannelActionResult> {
  const parsed = managedChannelInputSchema.safeParse(input);
  if (!parsed.success) {
    return { message: "Informe um nome válido para o canal.", ok: false };
  }

  const workspace = await getRequiredWorkspace();
  if (!["owner", "admin"].includes(workspace.membership.role)) {
    return {
      message: "Você não tem permissão para conectar números.",
      ok: false,
    };
  }

  let config: ReturnType<typeof getManagedChannelConfig>;
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    config = getManagedChannelConfig();
    admin = createSupabaseAdminClient();
    getAppBaseUrl();
  } catch (error) {
    return managedProvisioningErrorResult(error);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "register_managed_channel_provisioning",
    {
      connection_name: parsed.data.name,
      managed_provider: config.provider,
      provisioning_request_id: parsed.data.requestId,
      target_organization_id: workspace.organization.id,
    },
  );
  if (error) return managedProvisioningDatabaseErrorResult(error);

  const registration = managedChannelRegistrationSchema.safeParse(data);
  if (!registration.success) {
    return {
      message: "O banco retornou um estado de provisionamento inválido.",
      ok: false,
    };
  }

  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_managed_channel_provisioning",
    {
      target_organization_id: workspace.organization.id,
      target_run_id: registration.data.runId,
    },
  );
  if (claimError) return managedProvisioningDatabaseErrorResult(claimError);
  if (!claimed) {
    try {
      return await getCurrentProvisioningResult({
        admin,
        channelId: registration.data.channelId,
        organizationId: workspace.organization.id,
        runId: registration.data.runId,
      });
    } catch (currentError) {
      return managedProvisioningErrorResult(currentError);
    }
  }

  const result = config.provider === "wuzapi"
    ? await provisionManagedWuzapi({
      actorUserId: workspace.user.id,
      admin,
      config,
      organizationId: workspace.organization.id,
      registration: registration.data,
    })
    : await provisionManagedEvolution({
      actorUserId: workspace.user.id,
      admin,
      config,
      organizationId: workspace.organization.id,
      registration: registration.data,
    });
  revalidatePath(channelsPath);
  return result;
}
