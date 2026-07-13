"use client";

import {
  Bot,
  Database,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Headphones,
  RadioTower,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/app", exact: true },
  { icon: Bot, label: "Assistentes", href: "/app/assistants" },
  { icon: MessageSquareText, label: "Conversas", href: "/app/chat" },
  { icon: Headphones, label: "Atendimento", href: "/app/support" },
  { icon: RadioTower, label: "Canais", href: "/app/channels" },
  { icon: Zap, label: "Automacoes", href: "/app/automations" },
  { icon: Database, label: "Base de conhecimento", href: "/app/knowledge" },
  { icon: Settings, label: "Configurações", href: "/app/settings" },
];

type AppNavProps = {
  className?: string;
};

export function AppNav({ className }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("mt-10 space-y-1", className)}>
      {navItems.map(({ icon: Icon, label, href, exact }) => {
        const active = exact
          ? pathname === href
          : href !== "/app" && pathname.startsWith(href);

        return (
          <Link
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              active
                ? "bg-sidebar-active text-primary shadow-[inset_3px_0_0_var(--primary)]"
                : "text-muted-strong hover:bg-panel-subtle hover:text-foreground",
            )}
            href={href}
            key={label}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
