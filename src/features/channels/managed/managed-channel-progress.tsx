import { Check, Link2, QrCode, ShieldCheck } from "lucide-react";

export function ManagedChannelProgress({
  connected,
  hasPreparedInstance,
}: {
  connected: boolean;
  hasPreparedInstance: boolean;
}) {
  const steps = [
    {
      icon: ShieldCheck,
      label: "Preparar",
      state: hasPreparedInstance || connected ? "done" : "active",
    },
    {
      icon: QrCode,
      label: "Parear",
      state: connected ? "done" : hasPreparedInstance ? "active" : "pending",
    },
    {
      icon: Link2,
      label: "Conectar",
      state: connected ? "done" : "pending",
    },
  ];

  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Progresso da conexão">
      {steps.map((step) => {
        const Icon = step.state === "done" ? Check : step.icon;
        return (
          <li
            className={`rounded-[var(--radius-control)] border px-3 py-3 ${
              step.state === "done"
                ? "border-primary/25 bg-primary/5 text-primary"
                : step.state === "active"
                  ? "border-primary/35 bg-panel-elevated text-foreground"
                  : "border-panel-border bg-panel-subtle text-muted"
            }`}
            key={step.label}
          >
            <Icon aria-hidden="true" className="size-4" />
            <span className="mt-2 block text-xs font-medium">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
