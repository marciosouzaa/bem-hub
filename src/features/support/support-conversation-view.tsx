import { ArrowLeft, Hash, Radio } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupportContactPanel } from "@/features/support/support-contact-panel";
import { SupportDraftComposer } from "@/features/support/support-draft-composer";
import { SupportMessageThread } from "@/features/support/support-message-thread";
import type { SupportConversation } from "@/features/support/queries";
import {
  getContactInitials,
  getSupportContactName,
  supportPriorityLabels,
  supportStatusLabels,
} from "@/features/support/support-presenters";

export function SupportConversationView({
  conversation,
}: {
  conversation: SupportConversation;
}) {
  const name = getSupportContactName(conversation.contact);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-panel-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <Button asChild className="lg:hidden" size="icon" variant="ghost">
          <Link aria-label="Voltar para fila" href="/app/support">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-primary/20 bg-sidebar-active text-xs font-bold text-primary">
          {getContactInitials(name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
              {name}
            </h1>
            <Badge className="hidden normal-case tracking-normal sm:inline-flex">
              {supportStatusLabels[conversation.status]}
            </Badge>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
            <Radio className="size-3 shrink-0 text-primary" />
            <span className="truncate">{conversation.channel.name}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{conversation.channel.phoneNumber}</span>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Badge className="border-panel-border bg-panel-elevated normal-case tracking-normal text-muted-strong">
            Prioridade {supportPriorityLabels[conversation.priority].toLocaleLowerCase("pt-BR")}
          </Badge>
          <span className="flex items-center gap-1 rounded-lg border border-panel-border bg-panel-subtle px-2.5 py-1.5 font-mono text-[10px] text-muted">
            <Hash className="size-3" />
            {conversation.id.slice(0, 8)}
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="flex min-h-0 min-w-0 flex-col">
          <SupportMessageThread
            conversationId={conversation.id}
            messages={conversation.messages}
          />
          <SupportDraftComposer
            conversationId={conversation.id}
            status={conversation.status}
          />
        </main>
        <SupportContactPanel conversation={conversation} />
      </div>
    </div>
  );
}
