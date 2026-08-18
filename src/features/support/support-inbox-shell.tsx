"use client";

import {
  ChevronDown,
  Filter,
  Inbox,
  MessageSquarePlus,
  Plus,
  Radio,
  Search,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ChannelConnection } from "@/features/channels/channel-schema";
import type { SupportInboxItem as SupportInboxItemData } from "@/features/support/queries";
import {
  filterSupportInbox,
  type SupportInboxSort,
  type SupportInboxView,
} from "@/features/support/support-inbox-filters";
import { SupportInboxItem } from "@/features/support/support-inbox-item";
import { SupportStartDrawer } from "@/features/support/support-start-drawer";
import { cn } from "@/lib/utils";

type VisibleSupportInboxView = Exclude<SupportInboxView, "all">;

const views: Array<{ label: string; value: VisibleSupportInboxView }> = [
  { label: "Abertas", value: "open" },
  { label: "Atendidas", value: "assigned" },
  { label: "Minhas", value: "mine" },
  { label: "Grupos", value: "groups" },
  { label: "Encerradas", value: "resolved" },
];

export function SupportInboxShell({
  children,
  channels,
  conversations,
  viewerId,
}: {
  children: React.ReactNode;
  channels: ChannelConnection[];
  conversations: SupportInboxItemData[];
  viewerId: string;
}) {
  const pathname = usePathname();
  const [assignee, setAssignee] = useState("all");
  const [channelId, setChannelId] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [includeGroups, setIncludeGroups] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SupportInboxSort>("recent");
  const [startDrawerOpen, setStartDrawerOpen] = useState(false);
  const [tag, setTag] = useState("all");
  const [view, setView] = useState<SupportInboxView>("open");
  const deferredQuery = useDeferredValue(query);
  const hasSelection = pathname !== "/app/support";

  const assignees = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    for (const item of conversations) {
      if (!item.assignee) continue;
      byId.set(item.assignee.id, {
        id: item.assignee.id,
        label: item.assignee.name ?? item.assignee.email ?? "Atendente",
      });
    }
    return [...byId.values()].sort((left, right) =>
      left.label.localeCompare(right.label, "pt-BR"),
    );
  }, [conversations]);

  const tags = useMemo(() => {
    const values = new Set<string>();
    for (const item of conversations) {
      for (const itemTag of item.contact.tags) values.add(itemTag);
    }
    return [...values].sort((left, right) => left.localeCompare(right, "pt-BR"));
  }, [conversations]);

  const counts = useMemo(
    () => ({
      assigned: conversations.filter(
        (item) => item.status !== "resolved" && item.assignedTo !== null,
      ).length,
      groups: 0,
      mine: conversations.filter(
        (item) => item.status !== "resolved" && item.assignedTo === viewerId,
      ).length,
      open: conversations.filter((item) => item.status !== "resolved").length,
      resolved: conversations.filter((item) => item.status === "resolved").length,
    }),
    [conversations, viewerId],
  );

  const filteredConversations = useMemo(
    () => filterSupportInbox(conversations, {
      assignee,
      channelId,
      includeGroups,
      query: deferredQuery,
      sort,
      tag,
      view,
      viewerId,
    }),
    [
      assignee,
      channelId,
      conversations,
      deferredQuery,
      includeGroups,
      sort,
      tag,
      view,
      viewerId,
    ],
  );

  function chooseView(nextView: SupportInboxView) {
    if (nextView === "groups" && !includeGroups) return;
    setView(nextView);
  }

  function toggleGroups() {
    setIncludeGroups((enabled) => {
      const next = !enabled;
      if (!next && view === "groups") setView("open");
      return next;
    });
  }

  return (
    <>
      <div className="grid h-[calc(100dvh-4rem)] min-h-[560px] overflow-hidden bg-background lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
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
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Atendimentos
                </h1>
                <p className="mt-1 text-xs text-muted">
                  Busque, filtre e responda conversas.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <IconButton
                  label="Iniciar atendimento"
                  onClick={() => setStartDrawerOpen(true)}
                  size="sm"
                >
                  <Plus className="size-4" />
                </IconButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label="Abrir opções de atendimento"
                      className="h-9 px-2.5"
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <ChevronDown aria-hidden="true" className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Ações da fila</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setStartDrawerOpen(true)}>
                      <MessageSquarePlus aria-hidden="true" className="size-4" />
                      Iniciar atendimento
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/app/channels">
                        <Radio aria-hidden="true" className="size-4" />
                        Gerenciar canais
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-4 rounded-[16px] border border-panel-border bg-panel p-3">
              <div className="flex items-center gap-2">
                <Button
                  aria-pressed={filtersOpen}
                  className="h-9 flex-1 justify-start"
                  onClick={() => setFiltersOpen((open) => !open)}
                  size="sm"
                  type="button"
                  variant={filtersOpen ? "secondary" : "ghost"}
                >
                  <Filter className="size-4" />
                  Filtros avançados
                </Button>
                <Button
                  aria-pressed={includeGroups}
                  className={cn(
                    "h-9 shrink-0",
                    includeGroups
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "",
                  )}
                  onClick={toggleGroups}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <UsersRound className="size-4" />
                  Grupos
                </Button>
              </div>

              {filtersOpen ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Select aria-label="Departamento" disabled value="all">
                    <option value="all">Departamento</option>
                  </Select>
                  <Select
                    aria-label="Conexão"
                    onChange={(event) => setChannelId(event.target.value)}
                    value={channelId}
                  >
                    <option value="all">Conexão</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Atendente"
                    onChange={(event) => setAssignee(event.target.value)}
                    value={assignee}
                  >
                    <option value="all">Atendente</option>
                    <option value="unassigned">Sem responsável</option>
                    {assignees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Tag"
                    onChange={(event) => setTag(event.target.value)}
                    value={tag}
                  >
                    <option value="all">Tag</option>
                    {tags.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                  <div className="col-span-2 flex items-center gap-2 pt-1 text-[11px] text-muted">
                    <span>Ordenar:</span>
                    {[
                      ["recent", "Recentes"],
                      ["oldest", "Antigas"],
                      ["unread", "Não lidas"],
                    ].map(([value, label]) => (
                      <button
                        aria-pressed={sort === value}
                        className={cn(
                          "rounded-[8px] px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                          sort === value
                            ? "bg-sidebar-active text-primary"
                            : "text-muted hover:bg-panel-elevated hover:text-muted-strong",
                        )}
                        key={value}
                        onClick={() => setSort(value as SupportInboxSort)}
                        type="button"
                      >
                        {label}
                        {value === "unread" && counts.open ? (
                          <span className="ml-1 rounded bg-danger/15 px-1 text-[10px] text-danger">
                            {conversations.reduce((total, item) => total + item.unreadCount, 0)}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                aria-label="Buscar atendimentos"
                className="bg-panel pl-9 pr-10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar conversas..."
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
              {views.map((item) => {
                const disabled = item.value === "groups" && !includeGroups;
                return (
                  <button
                    aria-disabled={disabled}
                    aria-pressed={view === item.value}
                    className={cn(
                      "flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                      view === item.value
                        ? "bg-sidebar-active text-primary"
                        : "text-muted hover:bg-panel-elevated hover:text-muted-strong",
                      disabled && "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-muted",
                    )}
                    key={item.value}
                    onClick={() => chooseView(item.value)}
                    type="button"
                  >
                    {item.label}
                    <span className="font-mono text-[10px] opacity-70">
                      {counts[item.value]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted">
              <SlidersHorizontal className="size-3.5" />
              <span>Filtros locais aplicados à fila carregada</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filteredConversations.length ? (
              filteredConversations.map((item) => (
                <SupportInboxItem
                  active={pathname === `/app/support/${item.id}`}
                  item={item}
                  key={item.id}
                  viewerId={viewerId}
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
      <SupportStartDrawer
        channels={channels}
        onClose={() => setStartDrawerOpen(false)}
        open={startDrawerOpen}
      />
    </>
  );
}
