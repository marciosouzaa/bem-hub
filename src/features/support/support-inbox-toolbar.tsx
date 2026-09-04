"use client";

import { ChevronDown, Filter, MessageSquarePlus, Plus, Radio, Search, UsersRound, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ChannelConnection } from "@/features/channels/channel-schema";
import type { SupportInboxSort } from "@/features/support/support-inbox-filters";
import { SupportSoundPreferenceButton } from "@/features/support/support-sound-preference-button";
import { cn } from "@/lib/utils";

type SelectOption = { id: string; label: string };

export function SupportInboxToolbar({ assignee, assignees, channelId, channels, filtersOpen, includeGroups, onAssigneeChange, onChannelChange, onFiltersOpenChange, onGroupsToggle, onQueryChange, onSortChange, onStart, onTagChange, query, sort, tag, tags, unreadCount }: {
  assignee: string; assignees: SelectOption[]; channelId: string; channels: ChannelConnection[]; filtersOpen: boolean; includeGroups: boolean;
  onAssigneeChange: (value: string) => void; onChannelChange: (value: string) => void; onFiltersOpenChange: (open: boolean) => void; onGroupsToggle: () => void; onQueryChange: (value: string) => void; onSortChange: (sort: SupportInboxSort) => void; onStart: () => void; onTagChange: (value: string) => void;
  query: string; sort: SupportInboxSort; tag: string; tags: string[]; unreadCount: number;
}) {
  return <header className="border-b border-panel-border px-4 pb-4 pt-5">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="text-xl font-semibold tracking-tight text-foreground">Atendimentos</h1><p className="mt-1 text-xs text-muted">Busque, filtre e responda conversas.</p></div>
      <div className="flex items-center gap-1.5">
        <SupportSoundPreferenceButton />
        <IconButton label="Iniciar atendimento" onClick={onStart} size="sm"><Plus className="size-4" /></IconButton>
        <DropdownMenu><DropdownMenuTrigger asChild><Button aria-label="Abrir opções de atendimento" className="h-9 px-2.5" size="sm" type="button" variant="secondary"><ChevronDown aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel>Ações da fila</DropdownMenuLabel><DropdownMenuItem onSelect={onStart}><MessageSquarePlus aria-hidden="true" className="size-4" />Iniciar atendimento</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/app/channels"><Radio aria-hidden="true" className="size-4" />Gerenciar canais</Link></DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <div className="mt-4 rounded-[16px] border border-panel-border bg-panel p-3">
      <div className="flex items-center gap-2">
        <Button aria-pressed={filtersOpen} className="h-9 flex-1 justify-start" onClick={() => onFiltersOpenChange(!filtersOpen)} size="sm" type="button" variant={filtersOpen ? "secondary" : "ghost"}><Filter className="size-4" />Filtros avançados</Button>
        <Button aria-pressed={includeGroups} className={cn("h-9 shrink-0", includeGroups && "border-primary/35 bg-primary/10 text-primary")} onClick={onGroupsToggle} size="sm" type="button" variant="secondary"><UsersRound className="size-4" />Grupos</Button>
      </div>
      {filtersOpen ? <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <Select aria-label="Departamento" disabled value="all"><option value="all">Departamento</option></Select>
        <Select aria-label="Conexão" onChange={(event) => onChannelChange(event.target.value)} value={channelId}><option value="all">Conexão</option>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</Select>
        <Select aria-label="Atendente" onChange={(event) => onAssigneeChange(event.target.value)} value={assignee}><option value="all">Atendente</option><option value="unassigned">Sem responsável</option>{assignees.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        <Select aria-label="Tag" onChange={(event) => onTagChange(event.target.value)} value={tag}><option value="all">Tag</option>{tags.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 pt-1 text-[11px] text-muted"><span className="shrink-0">Ordenar:</span>
          {([ ["recent", "Recentes"], ["oldest", "Antigas"], ["unread", "Não lidas"] ] as const).map(([value, label]) => <button aria-pressed={sort === value} className={cn("rounded-[8px] px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", sort === value ? "bg-sidebar-active text-primary" : "text-muted hover:bg-panel-elevated hover:text-muted-strong")} key={value} onClick={() => onSortChange(value)} type="button">{label}{value === "unread" && unreadCount ? <span className="ml-1 rounded bg-danger/15 px-1 text-[10px] text-danger">{unreadCount}</span> : null}</button>)}
        </div>
      </div> : null}
    </div>
    <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Buscar atendimentos" className="bg-panel pl-9 pr-10" onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar conversas..." type="search" value={query} />{query ? <IconButton className="absolute right-1 top-1 size-8" label="Limpar busca" onClick={() => onQueryChange("")} size="sm" variant="ghost"><X className="size-3.5" /></IconButton> : null}</div>
  </header>;
}
