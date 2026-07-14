"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAiProviderConnectionAction } from "@/features/ai-provider-connections/actions";
import {
  aiProviderConnectionEditorSchema,
  type AiProviderConnectionEditorData,
  type AiProviderConnectionEditorInput,
} from "@/features/ai-provider-connections/connection-editor-schema";
import { AI_PROVIDERS } from "@/lib/ai/providers";

const formId = "ai-provider-connection-editor-form";
const defaultValues: AiProviderConnectionEditorInput = {
  apiKey: "",
  availableModels: "",
  defaultModel: "",
  isDefault: false,
  name: "",
  provider: "openai",
};

type ConnectionEditorDrawerProps = {
  onClose: () => void;
  onSaved: (message: string) => void;
  open: boolean;
};

export function ConnectionEditorDrawer({ onClose, onSaved, open }: ConnectionEditorDrawerProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<AiProviderConnectionEditorInput, unknown, AiProviderConnectionEditorData>({
    defaultValues,
    resolver: zodResolver(aiProviderConnectionEditorSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultValues);
  }, [open, reset]);

  function closeEditor() {
    setActionError(null);
    onClose();
  }

  async function submit(values: AiProviderConnectionEditorData) {
    const result = await createAiProviderConnectionAction({
      ...values,
      defaultModel: values.defaultModel ?? "",
    });
    if (!result.ok) {
      setActionError(result.message);
      if (result.errors) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (messages?.[0]) setError(field as keyof AiProviderConnectionEditorInput, { message: messages[0] });
        }
      }
      return;
    }
    reset(defaultValues);
    closeEditor();
    onSaved(result.message);
  }

  return (
    <EntityDrawer
      description="A chave é criptografada no servidor e nunca retorna para a interface."
      formId={formId}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={closeEditor}
      open={open}
      saveLabel="Salvar conexão"
      size="md"
      title="Nova conexão de IA"
    >
      <form className="space-y-8" id={formId} onSubmit={handleSubmit(submit)}>
        {actionError ? <p className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">{actionError}</p> : null}
        <FormSection description="Identifique o provedor e a conta sem expor a credencial." title="Credencial">
          <FormField error={errors.provider?.message} htmlFor="connection-provider" label="Provedor">
            <Select id="connection-provider" {...register("provider")}>
              {AI_PROVIDERS.map((provider) => <option key={provider.provider} value={provider.provider}>{provider.label}</option>)}
            </Select>
          </FormField>
          <FormField error={errors.name?.message} htmlFor="connection-name" label="Nome da conexão">
            <Input aria-invalid={Boolean(errors.name)} autoFocus id="connection-name" maxLength={80} placeholder="Conta principal" {...register("name")} />
          </FormField>
          <FormField description="A credencial será armazenada somente em formato criptografado." error={errors.apiKey?.message} htmlFor="connection-api-key" label="API key">
            <Input aria-invalid={Boolean(errors.apiKey)} autoComplete="off" className="font-mono" id="connection-api-key" placeholder="Cole a chave do provedor" type="password" {...register("apiKey")} />
          </FormField>
        </FormSection>
        <FormSection description="Deixe em branco para usar as sugestões mantidas pelo BEM HUB." title="Modelos">
          <FormField error={errors.defaultModel?.message} htmlFor="connection-default-model" label="Modelo padrão" optional>
            <Input aria-invalid={Boolean(errors.defaultModel)} className="font-mono" id="connection-default-model" placeholder="gpt-5.5" {...register("defaultModel")} />
          </FormField>
          <FormField error={errors.availableModels?.message} htmlFor="connection-models" label="Modelos disponíveis" optional>
            <Textarea aria-invalid={Boolean(errors.availableModels)} className="font-mono" id="connection-models" placeholder="Um modelo por linha" {...register("availableModels")} />
          </FormField>
          <label className="flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm text-muted-strong" htmlFor="connection-default">
            <Checkbox id="connection-default" {...register("isDefault")} />
            Usar como conexão padrão deste provedor
          </label>
        </FormSection>
      </form>
    </EntityDrawer>
  );
}
