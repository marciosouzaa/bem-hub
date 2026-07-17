import { z } from "zod";

const appBaseUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => new URL(value).protocol === "https:")
  .transform((value) => value.replace(/\/+$/, ""));

export class AppBaseUrlConfigError extends Error {
  constructor() {
    super("APP_BASE_URL não configurada.");
    this.name = "AppBaseUrlConfigError";
  }
}

export function getAppBaseUrl() {
  const explicit = process.env.APP_BASE_URL;
  const vercelHost = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? process.env.VERCEL_URL
  );
  const candidate = explicit ?? (vercelHost ? `https://${vercelHost}` : null);
  const parsed = appBaseUrlSchema.safeParse(candidate);
  if (!parsed.success) throw new AppBaseUrlConfigError();
  return parsed.data;
}

