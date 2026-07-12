"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Bot, Save, Sparkles, Trash2 } from "lucide-react";
import {
  createAssistantAction,
  updateAssistantAction,
  type AssistantFormState,
} from "@/features/assistants/actions";
import type { AiProviderConnectionListItem } from "@/features/ai-provider-connections/queries";
import type { AssistantListItem } from "@/features/assistants/queries";
import {
  buildCatalogAssistantTemplate,
  CATALOG_TONES,
  type CatalogTone,
} from "@/features/assistants/catalog-template";
import { AI_PROVIDERS, AI_PROVIDER_DEFINITIONS } from "@/lib/ai/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AssistantFormProps = {
  assistant?: AssistantListItem;
  canManage: boolean;
  providerConnections?: AiProviderConnectionListItem[];
  variant?: "card" | "inline";
};

const emptyAssistantFormState: AssistantFormState = {
  ok: false,
  message: null,
};

export function AssistantForm({
  assistant,
  canManage,
  providerConnections = [],
  variant = "card",
}: AssistantFormProps) {
  const action = assistant
    ? updateAssistantAction.bind(null, assistant.id)
    : createAssistantAction;
  const [state, formAction] = useActionState<AssistantFormState, FormData>(
    action,
    emptyAssistantFormState,
  );
  const [brandName, setBrandName] = useState("");
  const [catalogTone, setCatalogTone] = useState<CatalogTone>("acolhedor");
  const nameRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const instructionsRef = useRef<HTMLTextAreaElement>(null);
  const title = assistant ? "Editar assistente" : "Novo assistente";
  const description = assistant
    ? "Ajuste instrucao, area e modelo sem sair do workspace."
    : "Crie um assistente oficial para a rotina da empresa.";

  function applyCatalogTemplate() {
    const template = buildCatalogAssistantTemplate({
      brandName,
      tone: catalogTone,
    });

    if (nameRef.current) nameRef.current.value = template.name;
    if (areaRef.current) areaRef.current.value = template.area;
    if (descriptionRef.current) {
      descriptionRef.current.value = template.description;
    }
    if (instructionsRef.current) {
      instructionsRef.current.value = template.instructions;
      instructionsRef.current.focus();
    }
  }

  const form = (
    <form action={formAction} className="space-y-4">
      {!assistant && canManage ? (
        <div className="rounded-[var(--radius-control)] border border-primary/25 bg-sidebar-active/45 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Modelo de catalogo</p>
              <p className="mt-1 text-xs leading-5 text-muted-strong">
                Gere uma base segura e edite as instrucoes antes de criar.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="text-xs text-muted">Nome da marca</span>
              <input
                className="mt-1 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm focus:border-primary"
                maxLength={80}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Nome da empresa"
                value={brandName}
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Tom de voz</span>
              <select
                className="mt-1 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm focus:border-primary"
                onChange={(event) =>
                  setCatalogTone(event.target.value as CatalogTone)
                }
                value={catalogTone}
              >
                {CATALOG_TONES.map((tone) => (
                  <option key={tone.value} value={tone.value}>
                    {tone.label}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={applyCatalogTemplate} type="button" variant="secondary">
              Aplicar modelo
            </Button>
          </div>
        </div>
      ) : null}

      <FieldError errors={state.errors?.name} />
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          Nome
        </span>
        <input
          className="mt-2 h-10 w-full rounded-md border border-panel-border bg-panel-elevated px-3 text-sm outline-none transition placeholder:text-[#6f7772] focus:border-primary disabled:opacity-60"
          defaultValue={assistant?.name}
          disabled={!canManage}
          maxLength={80}
          name="name"
          placeholder="Atendimento comercial"
          ref={nameRef}
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Area
          </span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-panel-border bg-panel-elevated px-3 text-sm outline-none transition placeholder:text-[#6f7772] focus:border-primary disabled:opacity-60"
            defaultValue={assistant?.area ?? ""}
            disabled={!canManage}
            maxLength={60}
            name="area"
            placeholder="Suporte, vendas, juridico"
            ref={areaRef}
          />
          <FieldError errors={state.errors?.area} />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Provider
          </span>
          <select
            className="mt-2 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
            defaultValue={assistant?.provider ?? "openai"}
            disabled={!canManage}
            name="provider"
            required
          >
            {AI_PROVIDERS.map((provider) => (
              <option key={provider.provider} value={provider.provider}>
                {provider.label}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.provider} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Conexão de IA
          </span>
          <select
            className="mt-2 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
            defaultValue={assistant?.providerConnectionId ?? ""}
            disabled={!canManage}
            name="providerConnectionId"
          >
            <option value="">Fallback por ambiente</option>
            {providerConnections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.providerLabel} - {connection.name}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.providerConnectionId} />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Modelo
          </span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-panel-border bg-panel-elevated px-3 font-mono text-sm outline-none transition placeholder:text-[#6f7772] focus:border-primary disabled:opacity-60"
            defaultValue={
              assistant?.model ?? AI_PROVIDER_DEFINITIONS.openai.defaultModel
            }
            disabled={!canManage}
            list="assistant-model-options"
            maxLength={80}
            name="model"
            required
          />
          <datalist id="assistant-model-options">
            {providerConnections.flatMap((connection) =>
              connection.availableModels.map((model) => (
                <option
                  key={`${connection.id}-${model}`}
                  value={model}
                />
              )),
            )}
            {AI_PROVIDERS.flatMap((provider) =>
              provider.suggestedModels.map((model) => (
                <option key={`${provider.provider}-${model}`} value={model} />
              )),
            )}
          </datalist>
          <FieldError errors={state.errors?.model} />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          Descricao
        </span>
        <input
          className="mt-2 h-10 w-full rounded-md border border-panel-border bg-panel-elevated px-3 text-sm outline-none transition placeholder:text-[#6f7772] focus:border-primary disabled:opacity-60"
          defaultValue={assistant?.description ?? ""}
          disabled={!canManage}
          maxLength={180}
          name="description"
          placeholder="Responde duvidas frequentes e orienta proximos passos."
          ref={descriptionRef}
        />
        <FieldError errors={state.errors?.description} />
      </label>

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          Instrucoes
        </span>
        <textarea
          className="mt-2 min-h-32 w-full resize-y rounded-md border border-panel-border bg-panel-elevated px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-[#6f7772] focus:border-primary disabled:opacity-60"
          defaultValue={assistant?.instructions}
          disabled={!canManage}
          maxLength={4000}
          name="instructions"
          placeholder="Defina papel, limites, tom de voz e como o assistente deve usar documentos da empresa."
          ref={instructionsRef}
          required
        />
        <FieldError errors={state.errors?.instructions} />
      </label>

      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Temperatura
          </span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-panel-border bg-panel-elevated px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
            defaultValue={assistant?.temperature ?? 0.4}
            disabled={!canManage}
            max={2}
            min={0}
            name="temperature"
            required
            step={0.1}
            type="number"
          />
          <FieldError errors={state.errors?.temperature} />
        </label>

        <label className="mt-6 flex min-h-10 items-center gap-3 rounded-md border border-panel-border bg-panel-elevated px-3 text-sm text-muted-strong">
          <input
            className="size-4 accent-primary"
            defaultChecked={assistant?.isDefault}
            disabled={!canManage}
            name="isDefault"
            type="checkbox"
          />
          Definir como assistente padrao do workspace
        </label>
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className={state.ok ? "text-sm text-primary" : "text-sm text-danger"}
        >
          {state.message}
        </p>
      ) : null}

      {canManage ? (
        <SubmitButton label={assistant ? "Salvar alteracoes" : "Criar assistente"} />
      ) : (
        <p className="rounded-md border border-panel-border bg-panel-elevated px-3 py-2 text-sm text-muted">
          Seu perfil pode usar assistentes, mas nao pode gerenciar cadastro.
        </p>
      )}
    </form>
  );

  if (variant === "inline") {
    return form;
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-active text-primary">
            {assistant ? <Save className="size-4" /> : <Sparkles className="size-4" />}
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {form}
      </CardContent>
    </Card>
  );
}

export function DeleteAssistantForm({
  assistant,
  action,
}: {
  assistant: AssistantListItem;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action}>
      <Button
        aria-label={`Excluir ${assistant.name}`}
        size="icon"
        title="Excluir assistente"
        type="submit"
        variant="danger"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

export function SetDefaultAssistantForm({
  assistant,
  action,
}: {
  assistant: AssistantListItem;
  action: (formData: FormData) => void;
}) {
  if (assistant.isDefault) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-[#265b45] bg-[#123327] px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-primary">
        <Bot className="size-3.5" />
        Padrao
      </span>
    );
  }

  return (
    <form action={action}>
      <Button size="sm" type="submit" variant="secondary">
        Tornar padrao
      </Button>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Salvando..." : label}
    </Button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-2 text-xs text-danger">{errors[0]}</p>;
}
