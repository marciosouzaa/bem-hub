import { AtSign, CircleDot, Phone, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SupportConversation } from "@/features/support/queries";
import {
  getContactInitials,
  getSupportContactName,
  supportPriorityLabels,
  supportStatusLabels,
} from "@/features/support/support-presenters";

export function SupportContactPanel({
  conversation,
}: {
  conversation: SupportConversation;
}) {
  const name = getSupportContactName(conversation.contact);

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
        <Detail icon={Phone} label="Telefone" value={conversation.contact.phone ?? "Não informado"} />
        <Detail icon={AtSign} label="E-mail" value={conversation.contact.email ?? "Não informado"} />
        <Detail icon={Radio} label="Canal" value={conversation.channel.name} />
      </dl>

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

    </aside>
  );
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
