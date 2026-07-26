"use client";

import type {
  FieldErrors,
  UseFormRegister,
  UseFormRegisterReturn,
} from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import type {
  ChannelProvider,
  ChannelProviderFormValues,
} from "@/features/channels/channel-provider-schema";

type ChannelProviderCredentialFieldsProps = {
  errors: FieldErrors<ChannelProviderFormValues>;
  provider: ChannelProvider;
  register: UseFormRegister<ChannelProviderFormValues>;
};

export function ChannelProviderCredentialFields({
  errors,
  provider,
  register,
}: ChannelProviderCredentialFieldsProps) {
  if (provider === "z_api") {
    return (
      <FormSection
        description="O adapter continua no código para conexões legadas, mas novas configurações não são aceitas."
        title="Z-API pausada"
      >
        <p className="rounded-[var(--radius-control)] border border-warning/25 bg-warning/5 px-3 py-2.5 text-sm text-muted-strong">
          Escolha Evolution API, Wuzapi ou Uazapi para substituir este provedor.
        </p>
      </FormSection>
    );
  }

  if (provider === "evolution") {
    return (
      <FormSection
        description="O BEM HUB cria a instância se necessário. Informe a URL HTTPS e a API key global do seu servidor."
        title="Credenciais Evolution API"
      >
        <BaseUrlField
          error={errors.baseUrl?.message}
          id="evolution-base-url"
          placeholder="https://evolution.seudominio.com.br"
          registration={register("baseUrl")}
        />
        <FormField
          error={errors.instanceName?.message}
          htmlFor="evolution-instance-name"
          label="Nome da instância"
        >
          <Input
            autoComplete="off"
            className="font-mono"
            id="evolution-instance-name"
            {...register("instanceName")}
          />
        </FormField>
        <SecretField
          error={errors.apiKey?.message}
          id="evolution-api-key"
          label="API key"
          registration={register("apiKey")}
        />
      </FormSection>
    );
  }

  if (provider === "wuzapi") {
    return (
      <FormSection
        description="Use o token de um usuário isolado, não o Admin Token. O servidor precisa operar com WEBHOOK_FORMAT=json."
        title="Credenciais Wuzapi"
      >
        <BaseUrlField
          error={errors.baseUrl?.message}
          id="wuzapi-base-url"
          placeholder="https://wuzapi.seudominio.com.br"
          registration={register("baseUrl")}
        />
        <SecretField
          error={errors.userToken?.message}
          id="wuzapi-user-token"
          label="Token do usuário"
          registration={register("userToken")}
        />
        <SecretField
          description="Mínimo de 32 caracteres; usada para autenticar cada webhook."
          error={errors.webhookHmacKey?.message}
          id="wuzapi-hmac-key"
          label="Chave HMAC do webhook"
          registration={register("webhookHmacKey")}
        />
      </FormSection>
    );
  }

  return (
    <FormSection
      description="Use o endereço do servidor e o token da instância, nunca o Admin Token."
      title="Credenciais Uazapi"
    >
      <BaseUrlField
        error={errors.baseUrl?.message}
        id="uazapi-base-url"
        placeholder="https://free.uazapi.com"
        registration={register("baseUrl")}
      />
      <SecretField
        error={errors.instanceToken?.message}
        id="uazapi-instance-token"
        label="Token da instância"
        registration={register("instanceToken")}
      />
    </FormSection>
  );
}

function BaseUrlField({
  error,
  id,
  placeholder,
  registration,
}: {
  error?: string;
  id: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <FormField error={error} htmlFor={id} label="URL do servidor">
      <Input
        autoComplete="url"
        className="font-mono"
        id={id}
        placeholder={placeholder}
        {...registration}
      />
    </FormField>
  );
}

function SecretField({
  description = "O valor não retorna para a interface depois de salvo.",
  error,
  id,
  label,
  registration,
}: {
  description?: string;
  error?: string;
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <FormField
      description={description}
      error={error}
      htmlFor={id}
      label={label}
    >
      <Input
        autoComplete="off"
        className="font-mono"
        id={id}
        type="password"
        {...registration}
      />
    </FormField>
  );
}
