import { CircleAlert, Radio, Tag, UserCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { SupportInboxItem as SupportInboxItemData } from "@/features/support/queries";
import { SupportChannelStatusBadge } from "@/features/support/support-channel-status-badge";
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

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative block border-b border-panel-border/75 px-4 py-4 transition",
        "before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45",
        active
          ? "bg-sidebar-active/65"
          : "hover:bg-panel-elevated/55",
        priorityEdge[item.priority],
      )}
      href={`/app/support/${item.id}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[10px] border text-xs font-bold",
            active
              ? "border-primary/25 bg-primary/15 text-primary"
              : "border-panel-border bg-panel-elevated text-muted-strong",
          )}
        >
          {getContactInitials(name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {name}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <time className="font-mono text-[10px] text-muted">
                {formatSupportDate(item.lastMessageAt)}
              </time>
              {item.unreadCount > 0 ? (
                <span
                  aria-label={`${item.unreadCount} mensagens não lidas`}
                  className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary-foreground"
                >
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
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
  );
}
