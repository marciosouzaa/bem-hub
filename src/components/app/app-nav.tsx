"use client";

import {
  BarChart3,
  Bot,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Users,
  Workflow,
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
  { icon: Workflow, label: "Agentes IA", href: "/app" },
  { icon: Zap, label: "Automações", href: "/app" },
  { icon: Database, label: "Base de conhecimento", href: "/app" },
  { icon: FileText, label: "Documentos", href: "/app" },
  { icon: BarChart3, label: "Analytics", href: "/app" },
  { icon: Users, label: "Time", href: "/app" },
  { icon: CreditCard, label: "Plano", href: "/app/upgrade" },
  { icon: Settings, label: "Configurações", href: "/app" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-10 space-y-1">
      {navItems.map(({ icon: Icon, label, href, exact }) => {
        const active = exact
          ? pathname === href
          : href !== "/app" && pathname.startsWith(href);

        return (
          <Link
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
              active
                ? "bg-sidebar-active text-primary"
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
