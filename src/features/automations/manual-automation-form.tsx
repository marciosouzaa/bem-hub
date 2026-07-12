"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  CheckSquare,
  ClipboardList,
  FileBarChart,
  FileText,
  MessageSquareReply,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  runAutomationAction,
  type AutomationActionState,
} from "./actions";
import {
  AUTOMATION_TEMPLATES,
  getAutomationTemplate,
  type AutomationTemplateId,
} from "./templates";

const initialState: AutomationActionState = {
  ok: false,
  message: null,
  output: null,
};

const icons = {
  summarize: FileText,
  client_reply: MessageSquareReply,
  checklist: CheckSquare,
  report: FileBarChart,
  meeting_tasks: ClipboardList,
};

export function ManualAutomationForm() {
  const [templateId, setTemplateId] =
    useState<AutomationTemplateId>("summarize");
  const [state, action] = useActionState(runAutomationAction, initialState);
  const template = getAutomationTemplate(templateId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Escolha uma rotina</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {AUTOMATION_TEMPLATES.map((item) => {
              const Icon = icons[item.id];
              const active = item.id === templateId;
              return (
                <button
                  aria-pressed={active}
                  className={[
                    "rounded-[var(--radius-control)] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                    active
                      ? "border-primary bg-sidebar-active"
                      : "border-panel-border bg-panel-elevated hover:border-primary/50",
                  ].join(" ")}
                  key={item.id}
                  onClick={() => setTemplateId(item.id)}
                  type="button"
                >
                  <Icon className="size-5 text-primary" />
                  <span className="mt-3 block text-sm font-medium">{item.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
          <p className="text-sm text-muted-strong">{template.description}</p>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <input name="templateId" type="hidden" value={templateId} />
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                {template.inputLabel}
              </span>
              <textarea
                className="mt-2 min-h-52 w-full resize-y rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-muted focus:border-primary"
                maxLength={12000}
                name="input"
                placeholder={template.inputPlaceholder}
                required
              />
              {state.errors?.input?.[0] ? (
                <span className="mt-2 block text-xs text-danger">
                  {state.errors.input[0]}
                </span>
              ) : null}
            </label>
            <SubmitButton />
          </form>

          {state.message ? (
            <p
              aria-live="polite"
              className={`mt-4 text-sm ${state.ok ? "text-primary" : "text-danger"}`}
            >
              {state.message}
            </p>
          ) : null}

          {state.output ? (
            <div className="mt-5 rounded-[var(--radius-panel)] border border-primary/25 bg-panel-subtle p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                Resultado para revisao
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-strong">
                {state.output}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      <Play className="size-4" />
      {pending ? "Executando..." : "Executar automacao"}
    </Button>
  );
}
