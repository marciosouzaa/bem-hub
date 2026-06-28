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
    <details className={cn("group relative", className)}>
      <summary className="flex h-10 cursor-pointer list-none items-center gap-3 rounded-md px-2 transition hover:bg-panel [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#315041] bg-sidebar-active text-xs font-semibold text-primary">
          {initials}
        </span>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted">
            {organization}
          </span>
        </span>
        <ChevronDown className="hidden size-4 shrink-0 text-muted transition group-open:rotate-180 md:block" />
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-72 rounded-md border border-panel-border bg-panel-elevated p-2 shadow-[0_22px_70px_rgb(0_0_0/35%)]">
        <div className="px-3 py-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-primary">
              <UserRound className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              {email ? (
                <p className="mt-1 truncate text-xs text-muted">{email}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-panel-border bg-panel px-3 py-2 text-xs text-muted-strong">
            <Building2 className="size-4 text-primary" />
            <span className="min-w-0 truncate">{organization}</span>
            {role ? (
              <span className="ml-auto rounded bg-sidebar-active px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">
                {role}
              </span>
            ) : null}
          </div>
        </div>

        <div className="border-t border-panel-border pt-2">
          <button
            className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-muted-strong transition hover:bg-sidebar-active hover:text-primary"
            onClick={toggleTheme}
            type="button"
          >
            {isDark ? (
              <SunMedium className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
            {isDark ? "Ativar tema claro" : "Ativar tema escuro"}
          </button>
          <Link
            className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-strong transition hover:bg-[#2a1f1f] hover:text-danger"
            href="/auth/logout"
          >
            <LogOut className="size-4" />
            Sair do workspace
          </Link>
        </div>
      </div>
    </details>
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
