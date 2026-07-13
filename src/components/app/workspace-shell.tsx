"use client";

import { Bell, Menu, TerminalSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { CommandSearch } from "@/components/app/command-search";
import { UserMenu } from "@/components/app/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkspaceShellProps = {
  children: React.ReactNode;
  email?: string | null;
  name: string;
  organization: string;
  role: string;
};

const STORAGE_KEY = "bem-hub:sidebar-collapsed";

export function WorkspaceShell({ children, email, name, organization, role }: WorkspaceShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const canManage = ["owner", "admin"].includes(role);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true"));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!drawerOpen) return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDrawerOpen(false); menuButtonRef.current?.focus(); return; }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  function toggleSidebar() {
    setCollapsed((current) => {
      window.localStorage.setItem(STORAGE_KEY, String(!current));
      return !current;
    });
  }

  return <div className="flex h-dvh overflow-hidden bg-background text-foreground">
    <div className={cn("hidden h-dvh shrink-0 transition-[width] duration-300 ease-out lg:block", collapsed ? "w-20" : "w-64")}>
      <AppSidebar canManage={canManage} collapsed={collapsed} onToggle={toggleSidebar} organization={organization} />
    </div>

    <div className={cn("fixed inset-0 z-50 lg:hidden", drawerOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!drawerOpen} inert={!drawerOpen}>
      <button aria-label="Fechar menu" className={cn("absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300", drawerOpen ? "opacity-100" : "opacity-0")} onClick={() => setDrawerOpen(false)} tabIndex={drawerOpen ? 0 : -1} />
      <div aria-label="Menu principal" aria-modal="true" className={cn("relative h-dvh w-[min(88vw,320px)] shadow-[var(--shadow-popover)] transition-transform duration-300 ease-out", drawerOpen ? "translate-x-0" : "-translate-x-full")} ref={drawerRef} role="dialog">
        <AppSidebar canManage={canManage} mobile onClose={() => setDrawerOpen(false)} organization={organization} />
      </div>
    </div>

    <section className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-panel-border bg-background/95 px-4 backdrop-blur md:px-6 lg:px-8">
        <Button aria-expanded={drawerOpen} aria-label="Abrir menu" className="lg:hidden" onClick={() => setDrawerOpen(true)} ref={menuButtonRef} size="icon" variant="ghost"><Menu className="size-5" /></Button>
        <div className="min-w-0 flex-1"><CommandSearch containerClassName="max-w-3xl" /></div>
        <Button aria-label="Abrir terminal" className="hidden sm:inline-flex" size="icon" variant="ghost"><TerminalSquare className="size-5" /></Button>
        <Button aria-label="Notificacoes" size="icon" variant="ghost"><Bell className="size-5" /></Button>
        <div className="hidden h-8 w-px bg-panel-border md:block" />
        <UserMenu email={email} name={name} organization={organization} role={role} />
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
    </section>
  </div>;
}
