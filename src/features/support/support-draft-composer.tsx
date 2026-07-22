import { CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createDraftAction } from "@/features/support/actions";
import type { SupportConversation } from "@/features/support/queries";

export function SupportDraftComposer({
  conversationId,
  status,
}: {
  conversationId: string;
  status: SupportConversation["status"];
}) {
  if (status === "resolved") {
    return (
      <div className="border-t border-panel-border bg-panel-subtle px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-strong">
          <CheckCircle2 className="size-4 text-primary" />
          Atendimento resolvido. Histórico preservado para consulta.
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-panel-border bg-panel-subtle px-3 py-3 sm:px-5">
      <form
        action={createDraftAction.bind(null, conversationId)}
        className="mx-auto max-w-3xl rounded-[16px] border border-panel-border bg-panel p-2 shadow-[var(--shadow-card)] focus-within:border-primary/35 focus-within:shadow-[var(--shadow-focus)]"
      >
        <div className="flex items-center gap-2 px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
          <Sparkles className="size-3.5" />
          Resposta assistida
        </div>
        <Textarea
          className="min-h-20 resize-none border-0 bg-transparent focus:ring-0"
          id="support-draft"
          maxLength={10_000}
          name="content"
          placeholder="Prepare uma resposta para revisão humana..."
          required
        />
        <div className="flex flex-col gap-3 border-t border-panel-border px-2 pb-1 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-4 text-muted">
            Criar rascunho não envia mensagem ao cliente.
          </p>
          <Button className="sm:self-end" size="sm" type="submit">
            Preparar rascunho
          </Button>
        </div>
      </form>
    </div>
  );
}
