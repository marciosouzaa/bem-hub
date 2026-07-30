import { CircleOff, Radio, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SupportChannelOperationalStatus } from "@/features/support/queries";
import { cn } from "@/lib/utils";

const channelStatusConfig: Record<
  SupportChannelOperationalStatus,
  {
    icon: typeof Radio;
    label: string;
    style: string;
  }
> = {
  connected: {
    icon: Radio,
    label: "Conectado",
    style: "border-primary/25 bg-primary/10 text-primary",
  },
  disconnected: {
    icon: WifiOff,
    label: "Desconectado",
    style: "border-warning/25 bg-warning/10 text-warning",
  },
  inactive: {
    icon: CircleOff,
    label: "Inativo",
    style: "border-panel-border bg-panel-elevated text-muted",
  },
};

export function SupportChannelStatusBadge({
  compact = false,
  status,
}: {
  compact?: boolean;
  status: SupportChannelOperationalStatus;
}) {
  const config = channelStatusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        "shrink-0 normal-case tracking-normal",
        compact && "gap-1 px-1.5 py-0 text-[9px]",
        config.style,
      )}
    >
      <Icon aria-hidden="true" className={compact ? "size-2.5" : "size-3"} />
      {config.label}
    </Badge>
  );
}
