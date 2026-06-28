import { Bell, Sparkles, TerminalSquare } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/app/app-nav";
import { CommandSearch } from "@/components/app/command-search";
import { MobileShell } from "@/components/app/mobile-shell";
import { UserMenu } from "@/components/app/user-menu";
import { Button } from "@/components/ui/button";
import { getRequiredWorkspace } from "@/features/organizations/queries";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const workspace = await getRequiredWorkspace();
  const firstName =
    workspace.profile.name?.split(" ")[0] ||
    workspace.profile.email?.split("@")[0] ||
    "Operador";
  const canManage = ["owner", "admin"].includes(workspace.membership.role);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <MobileShell
        canManage={canManage}
        organization={workspace.organization.name}
      />

      <div className="grid min-h-[calc(100vh-64px)] lg:min-h-screen lg:grid-cols-[256px_1fr]">
        <aside className="hidden min-h-screen flex-col border-r border-panel-border bg-sidebar px-5 py-6 lg:flex">
          <Link href="/app" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <TerminalSquare className="size-5" />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-none">
                BEM HUB
              </span>
              <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-muted">
                Sistema operacional de IA
              </span>
            </span>
          </Link>

          <AppNav />

          <div className="mt-auto space-y-4 pt-8">
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
              <p className="mt-2 truncate text-sm font-medium">
                {workspace.organization.name}
              </p>
              <p className="mt-1 text-xs text-muted">
                {canManage ? "Gerenciamento ativo" : "Acesso de membro"}
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="hidden h-16 items-center gap-4 border-b border-panel-border bg-background/95 px-5 backdrop-blur md:px-8 lg:flex">
            <CommandSearch containerClassName="max-w-3xl" />
            <Button aria-label="Abrir terminal" size="icon" variant="ghost">
              <TerminalSquare className="size-5" />
            </Button>
            <Button aria-label="Notificações" size="icon" variant="ghost">
              <Bell className="size-5" />
            </Button>
            <div className="hidden h-8 w-px bg-panel-border md:block" />
            <UserMenu
              email={workspace.profile.email}
              name={firstName}
              organization={workspace.organization.name}
              role={workspace.membership.role}
            />
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}
