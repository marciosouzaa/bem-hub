"use client";

import {
  CircleAlert,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  Pin,
  PinOff,
  Radio,
  Tag,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupportInboxItem as SupportInboxItemData } from "@/features/support/queries";
import {
  markSupportConversationUnreadAction,
  setSupportConversationPinnedAction,
} from "@/features/support/support-actions";
import { SupportChannelStatusBadge } from "@/features/support/support-channel-status-badge";
import { SupportContactAvatar } from "@/features/support/support-contact-avatar";
import {
  formatSupportDate,
  getContactInitials,
  getSupportContactName,
  supportStatusLabels,
} from "@/features/support/support-presenters";
import { cn } from "@/lib/utils";

const statusStyles: Record<SupportInboxItemData["status"], string> = {
  open: "border-primary/25 bg-primary/10 text-primary",
  pending: "border-warning/25 bg-warning/10 text-warning",
  escalated: "border-danger/25 bg-danger/10 text-danger",
  resolved: "border-panel-border bg-panel-elevated text-muted-strong",
};

const priorityEdge: Record<SupportInboxItemData["priority"], string> = {
  low: "before:bg-transparent",
  normal: "before:bg-transparent",
  high: "before:bg-warning",
  urgent: "before:bg-danger",
};

type OptimisticState = {
  feedback?: string | null;
  itemId: string;
  pinned?: boolean;
  unreadCount?: number;
} | null;

export function SupportInboxItem({
  active,
  item,
  viewerId,
}: {
  active: boolean;
  item: SupportInboxItemData;
  viewerId: string;
}) {
  const name = getSupportContactName(item.contact);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticState, setOptimisticState] = useState<OptimisticState>(null);
  const currentOptimisticState = optimisticState?.itemId === item.id
    ? optimisticState
    : null;
  const optimisticPinned = currentOptimisticState?.pinned ?? item.isPinned;
  const unreadCount = currentOptimisticState?.unreadCount ?? item.unreadCount;
  const feedback = currentOptimisticState?.feedback ?? null;

  function setPinned(pinned: boolean) {
    if (isPending) return;
    const previous = optimisticPinned;
    setOptimisticState({
      itemId: item.id,
      pinned,
      unreadCount: currentOptimisticState?.unreadCount,
    });
    startTransition(async () => {
      const result = await setSupportConversationPinnedAction(item.id, pinned);
      if (!result.ok) {
        setOptimisticState({
          feedback: result.message,
          itemId: item.id,
          pinned: previous,
          unreadCount: currentOptimisticState?.unreadCount,
        });
        return;
      }
      router.refresh();
    });
  }

  function markUnread() {
    if (isPending || unreadCount > 0) return;
    setOptimisticState({
      itemId: item.id,
      pinned: currentOptimisticState?.pinned,
      unreadCount: 1,
    });
    startTransition(async () => {
      const result = await markSupportConversationUnreadAction(item.id);
      if (!result.ok) {
        setOptimisticState({
          feedback: result.message,
          itemId: item.id,
          pinned: currentOptimisticState?.pinned,
        });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "group relative border-b border-panel-border/75 transition",
        "before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full",
        active
          ? "bg-sidebar-active/65"
          : "hover:bg-panel-elevated/55",
        priorityEdge[item.priority],
      )}
    >
      <Link
        aria-current={active ? "page" : undefined}
        className="block px-4 py-4 pr-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45"
        href={`/app/support/${item.id}`}
      >
        <div className="flex items-start gap-3">
          <SupportContactAvatar
            active={active}
            avatarUrl={item.contact.avatarUrl}
            className="size-10 rounded-[10px] text-xs"
            initials={getContactInitials(name)}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="truncate text-sm font-semibold text-foreground">
                {name}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <time className="font-mono text-[10px] text-muted">
                  {formatSupportDate(item.lastMessageAt)}
                </time>
                {optimisticPinned ? (
                  <Pin
                    aria-label="Atendimento fixado"
                    className="size-3.5 text-primary"
                  />
                ) : null}
                {unreadCount > 0 ? (
                  <span
                    aria-label={`${unreadCount} mensagens não lidas`}
                    className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary-foreground"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <Radio className="size-3 shrink-0" />
              <span className="truncate">{item.channel.name}</span>
              <SupportChannelStatusBadge
                compact
                status={item.channel.operationalStatus}
              />
              <span aria-hidden="true">·</span>
              <span className="truncate">{item.contact.phone ?? "Sem telefone"}</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                <Badge
                  className={cn(
                    "shrink-0 px-2 py-0.5 text-[10px] normal-case tracking-normal",
                    statusStyles[item.status],
                  )}
                >
                  {supportStatusLabels[item.status]}
                </Badge>
                {item.contact.tags.slice(0, 1).map((tag) => (
                  <span
                    className="flex min-w-0 items-center gap-1 rounded-lg bg-panel-elevated px-2 py-1 text-[10px] text-muted-strong"
                    key={tag}
                  >
                    <Tag className="size-2.5 shrink-0" />
                    <span className="truncate">{tag}</span>
                  </span>
                ))}
                {item.assignedTo ? (
                  <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted">
                    <UserCheck className="size-2.5" />
                    {item.assignedTo === viewerId
                      ? "Com você"
                      : item.assignee?.name?.trim() || "Em atendimento"}
                  </span>
                ) : null}
              </div>
              {item.priority === "urgent" || item.priority === "high" ? (
                <CircleAlert
                  aria-label={item.priority === "urgent" ? "Prioridade urgente" : "Prioridade alta"}
                  className={cn(
                    "size-4 shrink-0",
                    item.priority === "urgent" ? "text-danger" : "text-warning",
                  )}
                />
              ) : null}
            </div>
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Ações do atendimento"
            className="absolute right-3 top-3 size-8 opacity-100 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100"
            disabled={isPending}
            size="icon"
            type="button"
            variant="secondary"
          >
            {isPending
              ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
              : <MoreHorizontal className="size-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setPinned(!optimisticPinned)}>
            {optimisticPinned
              ? <PinOff className="size-4" />
              : <Pin className="size-4" />}
            {optimisticPinned ? "Desfixar atendimento" : "Fixar atendimento"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={unreadCount > 0}
            onSelect={markUnread}
          >
            <Mail className="size-4" />
            Marcar como não lido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {feedback ? (
        <span aria-live="polite" className="sr-only">
          {feedback}
        </span>
      ) : null}
    </div>
  );
}
