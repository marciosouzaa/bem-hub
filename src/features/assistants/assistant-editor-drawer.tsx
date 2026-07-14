"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AiProviderConnectionListItem } from "@/features/ai-provider-connections/queries";
import { createAssistantAction, updateAssistantAction } from "@/features/assistants/actions";
import {
  assistantEditorSchema,
  type AssistantEditorData,
  type AssistantEditorInput,
} from "@/features/assistants/assistant-editor-schema";
import type { AssistantListItem } from "@/features/assistants/queries";
import { AssistantTemplatePanel } from "@/features/assistants/assistant-template-panel";
import { AI_PROVIDERS, AI_PROVIDER_DEFINITIONS, isSupportedProvider } from "@/lib/ai/providers";

const formId = "assistant-editor-form";

function getDefaultValues(assistant: AssistantListItem | null): AssistantEditorInput {
  return {
    area: assistant?.area ?? "",
    description: assistant?.description ?? "",
    instructions: assistant?.instructions ?? "",
    isDefault: assistant?.isDefault ?? false,
    model: assistant?.model ?? AI_PROVIDER_DEFINITIONS.openai.defaultModel,
    name: assistant?.name ?? "",
    provider: assistant?.provider ?? "openai",
    providerConnectionId: assistant?.providerConnectionId ?? "",
    temperature: assistant?.temperature ?? 0.4,
  };
}

type AssistantEditorDrawerProps = {
  assistant: AssistantListItem | null;
  connections: AiProviderConnectionListItem[];
  onClose: () => void;
  onSaved: (message: string) => void;
  open: boolean;
};

export function AssistantEditorDrawer({ assistant, connections, onClose, onSaved, open }: AssistantEditorDrawerProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    control,
    register,
    reset,
    setError,
    setValue,
  } = useForm<AssistantEditorInput, unknown, AssistantEditorData>({
    defaultValues: getDefaultValues(assistant),
    resolver: zodResolver(assistantEditorSchema),
  });
  const providerValue = useWatch({ control, name: "provider" });
  const provider = isSupportedProvider(providerValue) ? providerValue : "openai";
  const compatibleConnections = useMemo(
    () => connections.filter((connection) => connection.provider === provider && connection.status === "active"),
    [connections, provider],
  );
  const modelOptions = useMemo(
    () => [...new Set([...AI_PROVIDER_DEFINITIONS[provider].suggestedModels, ...compatibleConnections.flatMap((connection) => connection.availableModels)])],
    [compatibleConnections, provider],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(assistant));
  }, [assistant, open, reset]);

  function closeEditor() {
    setActionError(null);
    onClose();
  }

  async function submit(values: AssistantEditorData) {
    setActionError(null);
    const actionInput: AssistantEditorInput = {
      ...values,
      area: values.area ?? "",
      description: values.description ?? "",
      providerConnectionId: values.providerConnectionId ?? "",
    };
    const result = assistant
      ? await updateAssistantAction(assistant.id, actionInput)
      : await createAssistantAction(actionInput);

    if (!result.ok) {
      setActionError(result.message);
      if (result.errors) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (messages?.[0]) setError(field as keyof AssistantEditorInput, { message: messages[0] });
        }
      }
      return;
    }

    reset(getDefaultValues(assistant));
    closeEditor();
    onSaved(result.message);
  }

  return (
    <EntityDrawer
      description={assistant ? "Ajuste comportamento, modelo e vínculo operacional deste especialista." : "Configure um especialista oficial para uma rotina clara da empresa."}
      formId={formId}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={closeEditor}
      open={open}
      saveLabel={assistant ? "Salvar alterações" : "Criar assistente"}
      size="lg"
      title={assistant ? "Editar assistente" : "Novo assistente"}
    >
      <form className="space-y-8" id={formId} onSubmit={handleSubmit(submit)}>
        {!assistant ? (
          <AssistantTemplatePanel onApply={(template) => {
            setValue("name", template.name, { shouldDirty: true });
            setValue("area", template.area, { shouldDirty: true });
            setValue("description", template.description, { shouldDirty: true });
            setValue("instructions", template.instructions, { shouldDirty: true });
          }} />
        ) : null}

        {actionError ? <p className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">{actionError}</p> : null}

        <FormSection description="Identificação usada pela equipe ao escolher um especialista." title="Identidade">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField error={errors.name?.message} htmlFor="assistant-name" label="Nome">
              <Input aria-invalid={Boolean(errors.name)} autoFocus id="assistant-name" maxLength={80} placeholder="Atendimento comercial" {...register("name")} />
            </FormField>
            <FormField error={errors.area?.message} htmlFor="assistant-area" label="Área" optional>
              <Input aria-invalid={Boolean(errors.area)} id="assistant-area" maxLength={60} placeholder="Suporte, vendas, jurídico" {...register("area")} />
            </FormField>
          </div>
          <FormField error={errors.description?.message} htmlFor="assistant-description" label="Descrição" optional>
            <Input aria-invalid={Boolean(errors.description)} id="assistant-description" maxLength={180} placeholder="Orienta clientes e prepara próximos passos." {...register("description")} />
          </FormField>
        </FormSection>

        <FormSection description="Defina papel, limites, tom de voz e como documentos devem ser usados." title="Comportamento">
          <FormField error={errors.instructions?.message} htmlFor="assistant-instructions" label="Instruções">
            <Textarea aria-invalid={Boolean(errors.instructions)} id="assistant-instructions" maxLength={4_000} placeholder="Você é responsável por..." {...register("instructions")} />
          </FormField>
        </FormSection>

        <FormSection description="A conexão e o modelo são resolvidos no servidor; o ambiente continua disponível como fallback." title="Modelo e execução">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField error={errors.provider?.message} htmlFor="assistant-provider" label="Provedor">
              <Select id="assistant-provider" {...register("provider")}>
                {AI_PROVIDERS.map((item) => <option key={item.provider} value={item.provider}>{item.label}</option>)}
              </Select>
            </FormField>
            <FormField error={errors.providerConnectionId?.message} htmlFor="assistant-connection" label="Conexão" optional>
              <Select id="assistant-connection" {...register("providerConnectionId")}>
                <option value="">Fallback por ambiente</option>
                {compatibleConnections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <FormField error={errors.model?.message} htmlFor="assistant-model" label="Modelo">
              <Input aria-invalid={Boolean(errors.model)} className="font-mono" id="assistant-model" list="assistant-model-options" maxLength={80} {...register("model")} />
              <datalist id="assistant-model-options">{modelOptions.map((model) => <option key={model} value={model} />)}</datalist>
            </FormField>
            <FormField error={errors.temperature?.message} htmlFor="assistant-temperature" label="Temperatura">
              <Input aria-invalid={Boolean(errors.temperature)} id="assistant-temperature" max={2} min={0} step={0.1} type="number" {...register("temperature", { valueAsNumber: true })} />
            </FormField>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm text-muted-strong" htmlFor="assistant-default">
            <Checkbox id="assistant-default" {...register("isDefault")} />
            Definir como assistente padrão do workspace
          </label>
        </FormSection>
      </form>
    </EntityDrawer>
  );
}
