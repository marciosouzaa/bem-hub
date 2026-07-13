"use client";

import { PanelLeftClose, PanelLeftOpen, Sparkles, TerminalSquare, X } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/app/app-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  canManage: boolean;
  collapsed?: boolean;
  mobile?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  organization: string;
};

export function AppSidebar({ canManage, collapsed = false, mobile = false, onClose, onToggle, organization }: AppSidebarProps) {
  const compact = collapsed && !mobile;

  return <aside className="flex h-full min-h-0 flex-col border-r border-panel-border bg-sidebar">
    <div className={cn("flex h-20 shrink-0 items-center border-b border-panel-border/70", compact ? "justify-center px-3" : "px-5")}>
      <Link aria-label="BEM HUB - Dashboard" className="flex min-w-0 items-center gap-3" href="/app" onClick={onClose}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"><TerminalSquare className="size-5" /></span>
        {!compact ? <span className="min-w-0"><span className="block text-lg font-semibold leading-none">BEM HUB</span><span className="mt-1 block truncate text-[10px] uppercase tracking-[0.12em] text-muted">Sistema operacional de IA</span></span> : null}
      </Link>
      {mobile ? <Button aria-label="Fechar menu" className="ml-auto" onClick={onClose} size="icon" variant="ghost"><X className="size-5" /></Button> : null}
    </div>

    <div className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-5", compact ? "px-3" : "px-4")}>
      <AppNav collapsed={compact} onNavigate={onClose} />
    </div>

    <div className={cn("shrink-0 space-y-3 border-t border-panel-border/70 py-4", compact ? "px-3" : "px-4")}>
      <Button asChild className={cn("w-full", compact && "px-0")} size={compact ? "icon" : "lg"} title={compact ? "Perguntar a IA" : undefined}>
        <Link href="/app/chat" onClick={onClose}><Sparkles className="size-4" />{!compact ? "Perguntar a IA" : <span className="sr-only">Perguntar a IA</span>}</Link>
      </Button>
      {!compact ? <div className="rounded-[var(--radius-card)] border border-panel-border bg-panel p-3 shadow-[var(--shadow-card)]"><p className="text-[10px] uppercase tracking-[0.12em] text-muted">Workspace</p><p className="mt-1.5 truncate text-sm font-medium">{organization}</p><p className="mt-1 text-xs text-muted">{canManage ? "Gerenciamento ativo" : "Acesso de membro"}</p></div> : null}
      {!mobile ? <Button aria-label={compact ? "Expandir menu" : "Recolher menu"} className={cn("w-full", compact && "px-0")} onClick={onToggle} size={compact ? "icon" : "sm"} title={compact ? "Expandir menu" : undefined} variant="ghost">
        {compact ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /><span>Recolher menu</span></>}
      </Button> : null}
    </div>
  </aside>;
}
