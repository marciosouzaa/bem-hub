"use client";

import { Building2, Check, ShieldCheck, UserRound } from "lucide-react";
import { useTransition, useState } from "react";

import { selectWorkspaceAction } from "@/app/auth/select-workspace/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkspaceSelectionItem = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role: "owner" | "admin" | "member";
};

type WorkspaceSelectionPanelProps = {
  next: string;
  workspaces: WorkspaceSelectionItem[];
};

export function WorkspaceSelectionPanel({
  next,
  workspaces,
}: WorkspaceSelectionPanelProps) {
  const [selectedId, setSelectedId] = useState(workspaces[0]?.organization.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmSelection() {
    setError(null);
    startTransition(async () => {
      const result = await selectWorkspaceAction({
        next,
        organizationId: selectedId,
      });
      if (result && !result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {workspaces.map((workspace) => {
          const selected = selectedId === workspace.organization.id;
          const Icon = workspace.role === "member" ? UserRound : ShieldCheck;

          return (
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                selected
                  ? "border-primary/55 bg-primary/10"
                  : "border-panel-border bg-panel-elevated hover:border-primary/35",
              )}
              key={workspace.organization.id}
              onClick={() => setSelectedId(workspace.organization.id)}
              type="button"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sidebar-active text-primary">
                <Building2 aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {workspace.organization.name}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Icon aria-hidden="true" className="size-3.5" />
                  {getRoleLabel(workspace.role)}
                </span>
              </span>
              {selected ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button className="w-full" disabled={!selectedId || pending} onClick={confirmSelection}>
        {pending ? "Entrando..." : "Entrar nesta conta"}
      </Button>
    </div>
  );
}

function getRoleLabel(role: WorkspaceSelectionItem["role"]) {
  if (role === "owner") return "Conta principal";
  if (role === "admin") return "Admin da equipe";
  return "Equipe convidada";
}
