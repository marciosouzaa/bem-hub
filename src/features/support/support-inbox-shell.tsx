"use client";

import { Inbox, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import type { SupportInboxItem as SupportInboxItemData } from "@/features/support/queries";
import {
  filterSupportInbox,
  type SupportInboxView,
} from "@/features/support/support-inbox-filters";
import { SupportInboxItem } from "@/features/support/support-inbox-item";
import { cn } from "@/lib/utils";

const views: Array<{ label: string; value: SupportInboxView }> = [
  { label: "Todos", value: "all" },
  { label: "Abertos", value: "open" },
  { label: "Pendentes", value: "pending" },
  { label: "Escalados", value: "escalated" },
  { label: "Resolvidos", value: "resolved" },
];

export function SupportInboxShell({
  children,
  conversations,
}: {
  children: React.ReactNode;
  conversations: SupportInboxItemData[];
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<SupportInboxView>("all");
  const deferredQuery = useDeferredValue(query);
  const hasSelection = pathname !== "/app/support";

  const counts = useMemo(
    () => ({
      all: conversations.length,
      open: conversations.filter((item) => item.status === "open").length,
      pending: conversations.filter((item) => item.status === "pending").length,
      escalated: conversations.filter((item) => item.status === "escalated").length,
      resolved: conversations.filter((item) => item.status === "resolved").length,
    }),
    [conversations],
  );

  const filteredConversations = useMemo(
    () => filterSupportInbox(conversations, deferredQuery, view),
    [conversations, deferredQuery, view],
  );

  return (
    <div className="grid h-[calc(100dvh-4rem)] min-h-[560px] overflow-hidden bg-background lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside
        aria-label="Fila de atendimentos"
        className={cn(
          "min-h-0 flex-col border-r border-panel-border bg-panel-subtle",
          hasSelection ? "hidden lg:flex" : "flex",
        )}
      >
        <header className="border-b border-panel-border px-4 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-30 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">
                  Fila operacional
                </p>
              </div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                Atendimentos
              </h1>
            </div>
            <div className="rounded-[10px] border border-panel-border bg-panel px-3 py-2 text-right">
              <p className="font-mono text-lg font-semibold text-foreground">
                {counts.open + counts.pending + counts.escalated}
              </p>
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted">
                em curso
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Buscar atendimentos"
              className="bg-panel pl-9 pr-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar contato, canal ou tag"
              type="search"
              value={query}
            />
            {query ? (
              <IconButton
                className="absolute right-1 top-1 size-8"
                label="Limpar busca"
                onClick={() => setQuery("")}
                size="sm"
                variant="ghost"
              >
                <X className="size-3.5" />
              </IconButton>
            ) : null}
          </div>
        </header>

        <div className="border-b border-panel-border px-3 py-3">
          <div
            aria-label="Visualização dos atendimentos"
            className="flex items-center gap-1 overflow-x-auto pb-1"
            role="group"
          >
            {views.map((item) => (
              <button
                aria-pressed={view === item.value}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                  view === item.value
                    ? "bg-sidebar-active text-primary"
                    : "text-muted hover:bg-panel-elevated hover:text-muted-strong",
                )}
                key={item.value}
                onClick={() => setView(item.value)}
                type="button"
              >
                {item.label}
                <span className="font-mono text-[10px] opacity-70">
                  {counts[item.value]}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted">
            <SlidersHorizontal className="size-3.5" />
            <span>Ordenados pela atividade mais recente</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {filteredConversations.length ? (
            filteredConversations.map((item) => (
              <SupportInboxItem
                active={pathname === `/app/support/${item.id}`}
                item={item}
                key={item.id}
              />
            ))
          ) : (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-xl border border-panel-border bg-panel text-muted">
                <Inbox className="size-5" />
              </span>
              <p className="mt-4 text-sm font-medium text-foreground">
                Nenhum atendimento encontrado
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Ajuste a busca ou escolha outra visualização da fila.
              </p>
            </div>
          )}
        </div>
      </aside>

      <section
        className={cn(
          "min-h-0 min-w-0 bg-background",
          hasSelection ? "block" : "hidden lg:block",
        )}
      >
        {children}
      </section>
    </div>
  );
}
