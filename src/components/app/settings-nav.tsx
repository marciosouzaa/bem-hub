"use client";

import {
  CreditCard,
  KeyRound,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SettingsNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
};

const settingsNavItems: SettingsNavItem[] = [
  {
    href: "/app/settings/account",
    icon: UserRound,
    label: "Conta",
    description: "Responsável, workspace e acesso.",
  },
  {
    href: "/app/settings/billing",
    icon: CreditCard,
    label: "Plano",
    description: "Limites, assinatura e troca manual.",
  },
  {
    href: "/app/settings/ai-providers",
    icon: KeyRound,
    label: "Conexões de IA",
    description: "OpenAI, Claude, Gemini e modelos.",
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[var(--radius-panel)] border border-panel-border bg-panel p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
          <Settings className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">Configurações</p>
          <p className="text-xs text-muted">Workspace e operação</p>
        </div>
      </div>

      <nav className="mt-3 space-y-1">
        {settingsNavItems.map(({ description, href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              className={cn(
                "group flex gap-3 rounded-[var(--radius-control)] px-3 py-3 text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "bg-sidebar-active text-primary"
                  : "text-muted-strong hover:bg-panel-subtle hover:text-foreground",
              )}
              href={href}
              key={href}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block font-medium">{label}</span>
                <span
                  className={cn(
                    "mt-1 block text-xs leading-5",
                    active ? "text-primary/75" : "text-muted",
                  )}
                >
                  {description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
