"use client";

import {
  Bot,
  ContactRound,
  Database,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Headphones,
  RadioTower,
  Tags,
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
  { icon: ContactRound, label: "Contatos", href: "/app/contacts" },
  { icon: Tags, label: "Etiquetas", href: "/app/tags" },
  { icon: RadioTower, label: "Canais", href: "/app/channels" },
  { icon: Zap, label: "Automacoes", href: "/app/automations" },
  { icon: Database, label: "Base de conhecimento", href: "/app/knowledge" },
  { icon: Settings, label: "Configurações", href: "/app/settings" },
];

type AppNavProps = {
  className?: string;
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function AppNav({ className, collapsed = false, onNavigate }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegacao principal" className={cn("space-y-1", className)}>
      {navItems.map(({ icon: Icon, label, href, exact }) => {
        const active = exact
          ? pathname === href
          : href !== "/app" && pathname.startsWith(href);

        return (
          <Link
            className={cn(
              "flex h-10 w-full items-center rounded-[var(--radius-control)] text-left text-sm transition-[color,background-color,box-shadow,padding,gap] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
              active
                ? "bg-sidebar-active text-primary shadow-[inset_3px_0_0_var(--primary)]"
                : "text-muted-strong hover:bg-panel-subtle hover:text-foreground",
            )}
            href={href}
            key={label}
            onClick={onNavigate}
            style={collapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
            title={collapsed ? label : undefined}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {!collapsed ? <span className="truncate">{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
