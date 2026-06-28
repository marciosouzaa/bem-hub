import { Menu, Sparkles, TerminalSquare } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/app/app-nav";
import { Button } from "@/components/ui/button";

type MobileShellProps = {
  organization: string;
  canManage: boolean;
};

export function MobileShell({ canManage, organization }: MobileShellProps) {
  return (
    <details className="group border-b border-panel-border bg-sidebar lg:hidden">
      <summary className="flex h-16 cursor-pointer list-none items-center justify-between px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <TerminalSquare className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-none">
              BEM HUB
            </span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-muted">
              Sistema operacional de IA
            </span>
          </span>
        </span>
        <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated text-muted-strong transition group-open:text-primary">
          <Menu className="size-5" />
        </span>
      </summary>

      <div className="space-y-6 px-5 pb-6">
        <AppNav className="mt-2" />
        <Button asChild className="w-full" size="lg">
          <Link href="/app/chat">
            <Sparkles className="size-4" />
            Perguntar à IA
          </Link>
        </Button>
        <div className="rounded-[var(--radius-card)] border border-panel-border bg-panel p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">
            Workspace
          </p>
          <p className="mt-2 truncate text-sm font-medium">{organization}</p>
          <p className="mt-1 text-xs text-muted">
            {canManage ? "Gerenciamento ativo" : "Acesso de membro"}
          </p>
        </div>
      </div>
    </details>
  );
}
