"use client";

import { ArrowLeft, Hash, Radio } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupportContactPanel } from "@/features/support/support-contact-panel";
import { SupportChannelStatusBadge } from "@/features/support/support-channel-status-badge";
import { SupportConversationActions } from "@/features/support/support-conversation-actions";
import { SupportMessageComposer } from "@/features/support/support-message-composer";
import { SupportMessageThread } from "@/features/support/support-message-thread";
import { SupportReadReceipt } from "@/features/support/support-read-receipt";
import type { SupportConversation } from "@/features/support/queries";
import {
  getContactInitials,
  getSupportContactName,
  supportPriorityLabels,
  supportStatusLabels,
} from "@/features/support/support-presenters";

export function SupportConversationView({
  conversation,
  viewerCanAdmin,
  viewerId,
}: {
  conversation: SupportConversation;
  viewerCanAdmin: boolean;
  viewerId: string;
}) {
  const name = getSupportContactName(conversation.contact);
  const [optimisticMessages, setOptimisticMessages] = useState<SupportConversation["messages"]>([]);
  const [replyTo, setReplyTo] = useState<SupportConversation["messages"][number] | null>(null);
  const messages = [
    ...conversation.messages,
    ...optimisticMessages.filter((message) => !conversation.messages.some((persisted) => persisted.id === message.id)),
  ];

  function addOptimisticMessage(input: {
    content: string;
    replyTo: SupportConversation["messages"][number] | null;
    requestId: string;
  }) {
    setOptimisticMessages((current) => [...current, {
      acceptedAt: null,
      attachments: [],
      canReply: false,
      content: input.content,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      deliveryFailedAt: null,
      deliveryStatus: "sending",
      deliveryUpdatedAt: null,
      direction: "outbound",
      id: input.requestId,
      readAt: null,
      replyTo: input.replyTo
        ? {
          attachments: input.replyTo.attachments,
          content: input.replyTo.content,
          direction: input.replyTo.direction,
          id: input.replyTo.id,
        }
        : null,
      sentAt: null,
      status: "sending",
    }]);
  }

  function settleOptimisticMessage(requestId: string, messageId: string | null) {
    setOptimisticMessages((current) => messageId
      ? current.map((message) => message.id === requestId ? { ...message, id: messageId } : message)
      : current.filter((message) => message.id !== requestId));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SupportReadReceipt conversationId={conversation.id} />
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
            <SupportChannelStatusBadge
              compact
              status={conversation.channel.operationalStatus}
            />
            <span aria-hidden="true">·</span>
            <span className="truncate">
              {conversation.channel.phoneNumber ?? "Número não identificado"}
            </span>
          </div>
        </div>

        <SupportConversationActions
          conversation={conversation}
          viewerCanAdmin={viewerCanAdmin}
          viewerId={viewerId}
        />

        <div className="hidden items-center gap-2 2xl:flex">
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
            canRetry={
              conversation.status !== "resolved"
              && conversation.channel.operationalStatus === "connected"
              && (
                viewerCanAdmin
                || conversation.assignedTo === viewerId
              )
            }
            messages={messages}
            onReplyTo={setReplyTo}
          />
          <SupportMessageComposer
            assigned={conversation.assignedTo !== null}
            canSend={
              viewerCanAdmin || conversation.assignedTo === viewerId
            }
            channelStatus={conversation.channel.operationalStatus}
            conversationId={conversation.id}
            onOptimisticFailure={(requestId) => settleOptimisticMessage(requestId, null)}
            onOptimisticSend={addOptimisticMessage}
            onOptimisticSuccess={settleOptimisticMessage}
            onReplyToChange={setReplyTo}
            replyTo={replyTo}
            status={conversation.status}
          />
        </main>
        <SupportContactPanel conversation={conversation} />
      </div>
    </div>
  );
}
