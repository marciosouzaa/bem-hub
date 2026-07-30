import "server-only";

import { readFileSync } from "node:fs";
import { z } from "zod";

const managedWuzapiConfigSchema = z.object({
  adminToken: z.string().trim().min(16),
  baseUrl: z
    .string()
    .trim()
    .url()
    .transform((value) => value.replace(/\/+$/, "")),
});

export class ManagedChannelConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManagedChannelConfigError";
  }
}

export type ManagedWuzapiConfig = z.infer<typeof managedWuzapiConfigSchema>;

function readLocalWuzapiAdminToken() {
  const envFile = process.env.WUZAPI_LOCAL_ENV_FILE?.trim();
  if (!envFile || process.env.NODE_ENV === "production") {
    return undefined;
  }

  try {
    const prefix = "WUZAPI_ADMIN_TOKEN=";
    const line = readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .find((candidate) => candidate.trimStart().startsWith(prefix));
    if (!line) {
      return undefined;
    }

    const value = line.trimStart().slice(prefix.length).trim();
    const quote = value[0];
    if (
      value.length >= 2
      && (quote === "\"" || quote === "'")
      && value.at(-1) === quote
    ) {
      return value.slice(1, -1);
    }

    return value;
  } catch {
    return undefined;
  }
}

export function getManagedWuzapiConfig(): ManagedWuzapiConfig {
  if (process.env.WHATSAPP_MANAGED_PROVISIONING_ENABLED !== "true") {
    throw new ManagedChannelConfigError(
      "O provisionamento simplificado de WhatsApp não está habilitado.",
    );
  }

  const provider = process.env.WHATSAPP_MANAGED_PROVIDER ?? "wuzapi";
  if (provider !== "wuzapi") {
    throw new ManagedChannelConfigError(
      "O provedor gerenciado configurado ainda não está disponível.",
    );
  }

  const parsed = managedWuzapiConfigSchema.safeParse({
    adminToken:
      process.env.WUZAPI_ADMIN_TOKEN ?? readLocalWuzapiAdminToken(),
    baseUrl: process.env.WUZAPI_MANAGED_BASE_URL,
  });
  if (!parsed.success) {
    throw new ManagedChannelConfigError(
      "A conexão gerenciada com a Wuzapi ainda não foi configurada no servidor.",
    );
  }

  const url = new URL(parsed.data.baseUrl);
  const isSecure = url.protocol === "https:";
  const isDevelopmentLoopback = process.env.NODE_ENV !== "production"
    && url.protocol === "http:"
    && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!isSecure && !isDevelopmentLoopback) {
    throw new ManagedChannelConfigError(
      "A URL gerenciada da Wuzapi precisa usar HTTPS.",
    );
  }

  return parsed.data;
}
