import {
  AlertTriangle,
  AtSign,
  CircleDot,
  History,
  Phone,
  Radio,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatContactPhone } from "@/features/contacts/phone-normalization";
import type { SupportConversation } from "@/features/support/queries";
import {
  getContactInitials,
  getSupportContactName,
  formatSupportDate,
  supportPriorityLabels,
  supportStatusLabels,
} from "@/features/support/support-presenters";

export function SupportContactPanel({
  conversation,
}: {
  conversation: SupportConversation;
}) {
  const name = getSupportContactName(conversation.contact);
  const phone = formatContactPhone(
    conversation.contact.phone,
    conversation.contact.phoneStatus,
  );

  return (
    <aside className="hidden min-h-0 overflow-y-auto border-l border-panel-border bg-panel-subtle p-5 xl:block">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-sidebar-active text-sm font-bold text-primary">
          {getContactInitials(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="mt-1 text-xs text-muted">Contexto do contato</p>
        </div>
      </div>

      <dl className="mt-6 space-y-4 border-y border-panel-border py-5">
        <Detail icon={Phone} label="Telefone" value={phone} />
        <Detail icon={AtSign} label="E-mail" value={conversation.contact.email ?? "Não informado"} />
        <Detail icon={Radio} label="Canal" value={conversation.channel.name} />
      </dl>

      {conversation.contact.phoneStatus === "unsupported_country" ? (
        <div className="mt-5 flex gap-2 rounded-[var(--radius-control)] border border-warning/25 bg-warning/5 px-3 py-2.5 text-xs leading-5 text-muted-strong">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <p>
            DDI ainda não suportado. Contato identificado; resposta pode depender da identidade aceita pelo provedor.
          </p>
        </div>
      ) : conversation.contact.phoneStatus === "invalid" ? (
        <div className="mt-5 flex gap-2 rounded-[var(--radius-control)] border border-warning/25 bg-warning/5 px-3 py-2.5 text-xs leading-5 text-muted-strong">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <p>
            Telefone não validado. Atendimento foi preservado, mas a resposta depende de uma identidade roteável do provedor.
          </p>
        </div>
      ) : null}

      <section className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Estado operacional
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className="normal-case tracking-normal">
            <CircleDot className="mr-1 size-3" />
            {supportStatusLabels[conversation.status]}
          </Badge>
          <Badge className="border-panel-border bg-panel-elevated normal-case tracking-normal text-muted-strong">
            {supportPriorityLabels[conversation.priority]}
          </Badge>
        </div>
      </section>

      <section className="mt-7 border-t border-panel-border pt-6">
        <div className="flex items-center gap-2">
          <History className="size-3.5 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Atividade operacional
          </p>
        </div>
        {conversation.events.length ? (
          <ol className="mt-4 space-y-4">
            {conversation.events.slice(0, 8).map((event) => (
              <li className="relative pl-4" key={event.id}>
                <span className="absolute left-0 top-1.5 size-1.5 rounded-full bg-primary" />
                <p className="text-xs leading-5 text-muted-strong">
                  {describeSupportEvent(event)}
                </p>
                <p className="mt-1 font-mono text-[9px] text-muted">
                  {event.actorName?.trim() || "Sistema"} ·{" "}
                  {formatSupportDate(event.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-xs leading-5 text-muted">
            Mudanças de responsável, estado e prioridade aparecerão aqui.
          </p>
        )}
      </section>

    </aside>
  );
}

function describeSupportEvent(
  event: SupportConversation["events"][number],
) {
  if (event.type === "conversation.assigned") {
    return event.nextValue === null
      ? "Atendimento devolvido para a fila."
      : "Responsável pelo atendimento atualizado.";
  }
  if (event.type === "conversation.status_changed") {
    const status = event.nextValue as SupportConversation["status"];
    return `Estado alterado para ${supportStatusLabels[status]?.toLocaleLowerCase("pt-BR") ?? "outro estado"}.`;
  }
  const priority = event.nextValue as SupportConversation["priority"];
  return `Prioridade alterada para ${supportPriorityLabels[priority]?.toLocaleLowerCase("pt-BR") ?? "outro nível"}.`;
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-[0.1em] text-muted">{label}</dt>
        <dd className="mt-1 break-words text-xs leading-5 text-muted-strong">{value}</dd>
      </div>
    </div>
  );
}
