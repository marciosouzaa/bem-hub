"use client";

import { SlidersHorizontal } from "lucide-react";
import type { SupportInboxView } from "@/features/support/support-inbox-filters";
import { cn } from "@/lib/utils";

type VisibleSupportInboxView = Exclude<SupportInboxView, "all">;
const views: Array<{ label: string; value: VisibleSupportInboxView }> = [
  { label: "Abertas", value: "open" }, { label: "Não lidas", value: "unread" }, { label: "Atendidas", value: "assigned" }, { label: "Minhas", value: "mine" }, { label: "Grupos", value: "groups" }, { label: "Finalizadas", value: "resolved" },
];

export function SupportInboxTabs({ counts, includeGroups, onViewChange, view }: { counts: Record<VisibleSupportInboxView, number>; includeGroups: boolean; onViewChange: (view: SupportInboxView) => void; view: SupportInboxView }) {
  const visibleViews = includeGroups ? views : views.filter((item) => item.value !== "groups");
  return <div className="border-b border-panel-border px-3 py-3"><div aria-label="Visualização dos atendimentos" className="flex items-center gap-1 overflow-x-auto pb-1" role="group">{visibleViews.map((item) => <button aria-pressed={view === item.value} className={cn("flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45", view === item.value ? "bg-sidebar-active text-primary" : "text-muted hover:bg-panel-elevated hover:text-muted-strong")} key={item.value} onClick={() => onViewChange(item.value)} type="button">{item.label}<span className="font-mono text-[10px] opacity-70">{counts[item.value]}</span></button>)}</div><div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted"><SlidersHorizontal className="size-3.5" /><span>Filtros locais aplicados à fila carregada</span></div></div>;
}
