"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, PlugZap, Trash2 } from "lucide-react";
import {
  createAiProviderConnectionAction,
  type AiProviderConnectionFormState,
} from "@/features/ai-provider-connections/actions";
import type { AiProviderConnectionListItem } from "@/features/ai-provider-connections/queries";
import { AI_PROVIDERS } from "@/lib/ai/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ConnectionFormProps = {
  canManage: boolean;
};

const emptyState: AiProviderConnectionFormState = {
  ok: false,
  message: null,
};

export function AiProviderConnectionForm({ canManage }: ConnectionFormProps) {
  const [state, formAction] = useActionState<
    AiProviderConnectionFormState,
    FormData
  >(createAiProviderConnectionAction, emptyState);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
            <KeyRound className="size-5" />
          </span>
          <div>
            <CardTitle>Nova conexão de IA</CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-strong">
              Cadastre uma chave por organização. A chave é criptografada no
              servidor e nunca volta para a interface.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
              Provider
            </span>
            <select
              className="mt-2 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
              disabled={!canManage}
              name="provider"
            >
              {AI_PROVIDERS.map((provider) => (
                <option key={provider.provider} value={provider.provider}>
                  {provider.label}
                </option>
              ))}
            </select>
            <FieldError errors={state.errors?.provider} />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
              Nome da conexão
            </span>
            <input
              className="mt-2 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary disabled:opacity-60"
              disabled={!canManage}
              maxLength={80}
              name="name"
              placeholder="Conta principal OpenAI"
              required
            />
            <FieldError errors={state.errors?.name} />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
              API key
            </span>
            <input
              autoComplete="off"
              className="mt-2 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 font-mono text-sm outline-none transition placeholder:text-muted focus:border-primary disabled:opacity-60"
              disabled={!canManage}
              name="apiKey"
              placeholder="Cole a chave do provider"
              required
              type="password"
            />
            <FieldError errors={state.errors?.apiKey} />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
              Modelo padrão
            </span>
            <input
              className="mt-2 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 font-mono text-sm outline-none transition placeholder:text-muted focus:border-primary disabled:opacity-60"
              disabled={!canManage}
              name="defaultModel"
              placeholder="gpt-5.5"
            />
            <FieldError errors={state.errors?.defaultModel} />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
              Modelos disponíveis
            </span>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 py-3 font-mono text-sm leading-6 outline-none transition placeholder:text-muted focus:border-primary disabled:opacity-60"
              disabled={!canManage}
              name="availableModels"
              placeholder="Um por linha, ou deixe vazio para usar sugestões do provider."
            />
            <FieldError errors={state.errors?.availableModels} />
          </label>

          <label className="flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm text-muted-strong">
            <input
              className="size-4 accent-primary"
              disabled={!canManage}
              name="isDefault"
              type="checkbox"
            />
            Definir como conexão padrão deste provider
          </label>

          {state.message ? (
            <p
              aria-live="polite"
              className={
                state.ok ? "text-sm text-primary" : "text-sm text-danger"
              }
            >
              {state.message}
            </p>
          ) : null}

          {canManage ? (
            <SubmitButton />
          ) : (
            <p className="rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 py-2 text-sm text-muted">
              Seu perfil pode usar conexões, mas apenas owners e admins podem
              gerenciá-las.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export function DeleteAiProviderConnectionForm({
  action,
  connection,
}: {
  action: (formData: FormData) => void;
  connection: AiProviderConnectionListItem;
}) {
  return (
    <form action={action}>
      <Button
        aria-label={`Excluir ${connection.name}`}
        size="icon"
        title="Excluir conexão"
        type="submit"
        variant="danger"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

export function SetDefaultAiProviderConnectionForm({
  action,
  connection,
}: {
  action: (formData: FormData) => void;
  connection: AiProviderConnectionListItem;
}) {
  if (connection.isDefault) {
    return (
      <span className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-primary/25 bg-sidebar-active px-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
        <PlugZap className="size-3.5" />
        Padrão
      </span>
    );
  }

  return (
    <form action={action}>
      <Button size="sm" type="submit" variant="secondary">
        Tornar padrão
      </Button>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Salvando..." : "Salvar conexão"}
    </Button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-2 text-xs text-danger">{errors[0]}</p>;
}
