import { Inbox, Radio, ShieldCheck } from "lucide-react";

export function SupportEmptySelection() {
  return (
    <div className="os-grid flex h-full min-h-0 items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-[18px] border border-primary/20 bg-sidebar-active text-primary shadow-[var(--shadow-glow)]">
          <Inbox className="size-6" />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">
          Central de atendimento
        </p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          Selecione uma conversa da fila
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-strong">
          Histórico, rascunhos e contexto do contato aparecem aqui sem tirar você da operação.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <Radio className="size-3.5 text-primary" />
            Fila ativa
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            Revisão humana
          </span>
        </div>
      </div>
    </div>
  );
}
