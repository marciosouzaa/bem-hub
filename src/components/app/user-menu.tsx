"use client";

import {
  Building2,
  ChevronDown,
  LogOut,
  Moon,
  SunMedium,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/theme/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  name: string;
  organization: string;
  role?: string;
  email?: string | null;
  className?: string;
};

export function UserMenu({
  name,
  organization,
  role,
  email,
  className,
}: UserMenuProps) {
  const initials = getInitials(name || email || organization);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group flex h-10 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-2 transition hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 data-[state=open]:bg-panel",
            className,
          )}
          type="button"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-sidebar-active text-xs font-semibold text-primary">
            {initials}
          </span>
          <span className="hidden min-w-0 text-left md:block">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted">
              {organization}
            </span>
          </span>
          <ChevronDown className="hidden size-4 shrink-0 text-muted transition group-data-[state=open]:rotate-180 md:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 rounded-[var(--radius-panel)] p-2" sideOffset={8}>
        <div className="px-3 py-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
              <UserRound className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              {email ? (
                <p className="mt-1 truncate text-xs text-muted">{email}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-control)] border border-panel-border bg-panel px-3 py-2 text-xs text-muted-strong">
            <Building2 className="size-4 text-primary" />
            <span className="min-w-0 truncate">{organization}</span>
            {role ? (
              <span className="ml-auto rounded-[6px] bg-sidebar-active px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">
                {role}
              </span>
            ) : null}
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={toggleTheme}>
          {isDark ? (
            <SunMedium className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          {isDark ? "Ativar tema claro" : "Ativar tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild danger>
          <Link href="/auth/logout">
            <LogOut className="size-4" />
            Sair do workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "BH";
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}
