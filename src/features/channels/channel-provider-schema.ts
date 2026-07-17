import { z } from "zod";

export const channelProviderSchema = z.enum(["uazapi", "z_api"]);

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
  .refine((value) => new URL(value).protocol === "https:", "Use uma URL HTTPS.")
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

export const channelProviderCredentialsSchema = z.discriminatedUnion("provider", [
  uazapiCredentialsSchema,
  zApiCredentialsSchema,
]);

export const channelProviderFormSchema = z.object({
  baseUrl: z.string(),
  clientToken: z.string(),
  instanceId: z.string(),
  instanceToken: z.string(),
  provider: channelProviderSchema,
}).superRefine((value, context) => {
  const parsed = channelProviderCredentialsSchema.safeParse(
    toChannelProviderCredentials(value),
  );
  if (parsed.success) return;

  for (const issue of parsed.error.issues) {
    const field = issue.path.at(-1);
    context.addIssue({
      code: "custom",
      message: issue.message,
      path: field === "baseUrl" || field === "clientToken" || field === "instanceId"
        ? [field]
        : ["instanceToken"],
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
  return {
    clientToken: values.clientToken,
    instanceId: values.instanceId,
    instanceToken: values.instanceToken,
    provider: "z_api",
  };
}

export type ChannelProvider = z.infer<typeof channelProviderSchema>;
export type ChannelProviderCredentials = z.infer<typeof channelProviderCredentialsSchema>;
export type ChannelProviderStatus = z.infer<typeof channelProviderStatusSchema>;
