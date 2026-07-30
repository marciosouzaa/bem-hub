import "server-only";

import { z } from "zod";

import { ManagedChannelConfigError } from "@/features/channels/managed/managed-channel-config";
import type { ManagedChannelActionResult } from "@/features/channels/managed/managed-channel-contracts";
import { ChannelProviderRequestError } from "@/features/channels/providers/provider-http";
import { AppBaseUrlConfigError } from "@/lib/app-url";
import { EncryptionConfigError } from "@/lib/security/encryption";
import { SupabaseAdminConfigError } from "@/lib/supabase/admin";

export class ManagedProvisioningDatabaseError extends Error {
  constructor() {
    super("Não foi possível salvar o provisionamento.");
    this.name = "ManagedProvisioningDatabaseError";
  }
}

export function managedProvisioningErrorResult(
  error: unknown,
): Extract<ManagedChannelActionResult, { ok: false }> {
  if (error instanceof ManagedChannelConfigError) {
    return { message: error.message, ok: false };
  }
  if (error instanceof ChannelProviderRequestError) {
    return {
      message: "A Wuzapi não concluiu a preparação. Tente novamente.",
      ok: false,
    };
  }
  if (error instanceof AppBaseUrlConfigError) {
    return {
      message: "APP_BASE_URL não configurada para receber mensagens.",
      ok: false,
    };
  }
  if (error instanceof EncryptionConfigError) {
    return {
      message: "APP_ENCRYPTION_KEY não configurada.",
      ok: false,
    };
  }
  if (error instanceof SupabaseAdminConfigError) {
    return {
      message: "SUPABASE_SECRET_KEY não configurada.",
      ok: false,
    };
  }
  if (
    error instanceof ManagedProvisioningDatabaseError
    || error instanceof z.ZodError
    || error instanceof SyntaxError
  ) {
    return {
      message: "Não foi possível salvar o provisionamento.",
      ok: false,
    };
  }
  return {
    message: "Não foi possível preparar esta conexão.",
    ok: false,
  };
}

export function managedProvisioningDatabaseErrorResult(error: {
  code?: string;
  message: string;
}) {
  const missingSchema = error.code === "42883"
    || error.code === "42P01"
    || error.message.includes("schema cache");
  return {
    message: missingSchema
      ? "A migration de provisionamento gerenciado ainda não foi aplicada."
      : "Não foi possível iniciar o provisionamento.",
    ok: false as const,
  };
}
