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

const managedEvolutionConfigSchema = z.object({
  apiKey: z.string().trim().min(16),
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
export type ManagedEvolutionConfig = z.infer<typeof managedEvolutionConfigSchema>;
export type ManagedChannelConfig =
  | ({ provider: "wuzapi" } & ManagedWuzapiConfig)
  | ({ provider: "evolution" } & ManagedEvolutionConfig);
export type ManagedChannelProvider = ManagedChannelConfig["provider"];

function readLocalEnvValue(envFile: string | undefined, key: string) {
  const path = envFile?.trim();
  if (!path || process.env.NODE_ENV === "production") {
    return undefined;
  }

  try {
    const prefix = `${key}=`;
    const line = readFileSync(path, "utf8")
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

function assertInternalBaseUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  const isSecure = url.protocol === "https:";
  const isDevelopmentLoopback = process.env.NODE_ENV !== "production"
    && url.protocol === "http:"
    && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!isSecure && !isDevelopmentLoopback) {
    throw new ManagedChannelConfigError(
      "A URL interna do provedor precisa usar HTTPS.",
    );
  }
}

function assertManagedProvisioningEnabled() {
  if (process.env.WHATSAPP_MANAGED_PROVISIONING_ENABLED !== "true") {
    throw new ManagedChannelConfigError(
      "O provisionamento simplificado de WhatsApp não está habilitado.",
    );
  }
}

export function getManagedProviderConfig(
  provider: ManagedChannelProvider,
): ManagedChannelConfig {
  assertManagedProvisioningEnabled();
  if (provider === "wuzapi") {
    const parsed = managedWuzapiConfigSchema.safeParse({
      adminToken: process.env.WUZAPI_ADMIN_TOKEN ?? readLocalEnvValue(
        process.env.WUZAPI_LOCAL_ENV_FILE,
        "WUZAPI_ADMIN_TOKEN",
      ),
      baseUrl: process.env.WUZAPI_MANAGED_BASE_URL,
    });
    if (!parsed.success) {
      throw new ManagedChannelConfigError(
        "A conexão gerenciada com a Wuzapi ainda não foi configurada no servidor.",
      );
    }
    assertInternalBaseUrl(parsed.data.baseUrl);
    return { provider, ...parsed.data };
  }

  if (provider === "evolution") {
    const parsed = managedEvolutionConfigSchema.safeParse({
      apiKey: process.env.EVOLUTION_API_KEY ?? readLocalEnvValue(
        process.env.EVOLUTION_LOCAL_ENV_FILE,
        "AUTHENTICATION_API_KEY",
      ),
      baseUrl: process.env.EVOLUTION_MANAGED_BASE_URL,
    });
    if (!parsed.success) {
      throw new ManagedChannelConfigError(
        "A conexão gerenciada com a Evolution ainda não foi configurada no servidor.",
      );
    }
    assertInternalBaseUrl(parsed.data.baseUrl);
    return { provider, ...parsed.data };
  }

  throw new ManagedChannelConfigError(
    "O provedor gerenciado configurado ainda não está disponível.",
  );
}

export function getManagedChannelConfig(): ManagedChannelConfig {
  const provider = process.env.WHATSAPP_MANAGED_PROVIDER ?? "wuzapi";
  if (provider !== "wuzapi" && provider !== "evolution") {
    throw new ManagedChannelConfigError(
      "O provedor gerenciado configurado ainda não está disponível.",
    );
  }
  return getManagedProviderConfig(provider);
}

export function getManagedWuzapiConfig(): ManagedWuzapiConfig {
  const config = getManagedProviderConfig("wuzapi");
  return config as ManagedWuzapiConfig;
}

export function getManagedEvolutionConfig(): ManagedEvolutionConfig {
  const config = getManagedProviderConfig("evolution");
  return config as ManagedEvolutionConfig;
}
