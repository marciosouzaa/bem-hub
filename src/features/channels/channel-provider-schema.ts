import { z } from "zod";

export const channelProviderSchema = z.enum([
  "uazapi",
  "z_api",
  "evolution",
  "wuzapi",
]);

export const configurableChannelProviderSchema = z.enum([
  "uazapi",
  "evolution",
  "wuzapi",
]);

export const channelProviderStatusSchema = z.enum([
  "draft",
  "provisioning",
  "awaiting_pairing",
  "connecting",
  "connected",
  "degraded",
  "disconnected",
  "failed",
  "disabled",
]);

const httpsBaseUrlSchema = z
  .string()
  .trim()
  .url("Informe uma URL válida.")
  .refine((value) => {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return process.env.NODE_ENV !== "production"
      && url.protocol === "http:"
      && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  }, "Use uma URL HTTPS.")
  .transform((value) => value.replace(/\/+$/, ""));

export const uazapiCredentialsSchema = z.object({
  provider: z.literal("uazapi"),
  baseUrl: httpsBaseUrlSchema,
  instanceToken: z.string().trim().uuid("Informe um token de instância válido."),
});

export const zApiCredentialsSchema = z.object({
  provider: z.literal("z_api"),
  clientToken: z.string().trim().min(16, "Informe o Client-Token."),
  instanceId: z.string().trim().min(8, "Informe o ID da instância."),
  instanceToken: z.string().trim().min(8, "Informe o token da instância."),
});

export const evolutionCredentialsSchema = z.object({
  provider: z.literal("evolution"),
  apiKey: z.string().trim().min(16, "Informe a API key da Evolution."),
  baseUrl: httpsBaseUrlSchema,
  instanceName: z
    .string()
    .trim()
    .min(3, "Informe o nome da instância.")
    .max(100, "Use no máximo 100 caracteres.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, hífen ou sublinhado."),
  webhookEndpointToken: z.string().trim().min(40).max(100).optional(),
});

export const wuzapiCredentialsSchema = z.object({
  provider: z.literal("wuzapi"),
  baseUrl: httpsBaseUrlSchema,
  userToken: z.string().trim().min(16, "Informe o token do usuário Wuzapi."),
  webhookEndpointToken: z.string().trim().min(40).max(100).optional(),
  webhookHmacKey: z
    .string()
    .min(32, "A chave HMAC precisa ter ao menos 32 caracteres.")
    .max(256, "Use no máximo 256 caracteres."),
});

export const channelProviderCredentialsSchema = z.discriminatedUnion("provider", [
  uazapiCredentialsSchema,
  zApiCredentialsSchema,
  evolutionCredentialsSchema,
  wuzapiCredentialsSchema,
]);

export const channelProviderFormSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string(),
  clientToken: z.string(),
  instanceId: z.string(),
  instanceName: z.string(),
  instanceToken: z.string(),
  provider: channelProviderSchema,
  userToken: z.string(),
  webhookHmacKey: z.string(),
}).superRefine((value, context) => {
  if (value.provider === "z_api") {
    context.addIssue({
      code: "custom",
      message: "Novas configurações Z-API estão pausadas.",
      path: ["provider"],
    });
    return;
  }

  const parsed = channelProviderCredentialsSchema.safeParse(
    toChannelProviderCredentials(value),
  );
  if (parsed.success) return;

  for (const issue of parsed.error.issues) {
    const field = issue.path.at(-1);
    context.addIssue({
      code: "custom",
      message: issue.message,
      path: typeof field === "string" ? [field] : ["provider"],
    });
  }
});

export type ChannelProviderFormValues = z.infer<typeof channelProviderFormSchema>;

export function toChannelProviderCredentials(
  values: ChannelProviderFormValues,
): ChannelProviderCredentials {
  if (values.provider === "uazapi") {
    return {
      baseUrl: values.baseUrl,
      instanceToken: values.instanceToken,
      provider: "uazapi",
    };
  }
  if (values.provider === "z_api") {
    return {
      clientToken: values.clientToken,
      instanceId: values.instanceId,
      instanceToken: values.instanceToken,
      provider: "z_api",
    };
  }
  if (values.provider === "evolution") {
    return {
      apiKey: values.apiKey,
      baseUrl: values.baseUrl,
      instanceName: values.instanceName,
      provider: "evolution",
    };
  }
  return {
    baseUrl: values.baseUrl,
    provider: "wuzapi",
    userToken: values.userToken,
    webhookHmacKey: values.webhookHmacKey,
  };
}

export type ChannelProvider = z.infer<typeof channelProviderSchema>;
export type ChannelProviderCredentials = z.infer<typeof channelProviderCredentialsSchema>;
export type ChannelProviderStatus = z.infer<typeof channelProviderStatusSchema>;
