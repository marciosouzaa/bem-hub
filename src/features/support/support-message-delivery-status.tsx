import {
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  type LucideIcon,
} from "lucide-react";

import type { SupportMessage } from "@/features/support/queries";
import { supportMessageStatusLabels } from "@/features/support/support-presenters";
import { cn } from "@/lib/utils";

type DeliveryPresentation = {
  className: string;
  description: string;
  icon: LucideIcon;
  label: string;
};

const deliveryPresentations: Record<
  SupportMessage["deliveryStatus"],
  DeliveryPresentation
> = {
  not_sent: {
    className: "text-muted",
    description: "A mensagem ainda não foi enviada ao canal.",
    icon: Clock3,
    label: "Não enviada",
  },
  sending: {
    className: "text-warning",
    description: "Enviando a mensagem ao canal.",
    icon: Clock3,
    label: "Enviando",
  },
  accepted: {
    className: "text-muted-strong",
    description: "O canal aceitou a mensagem e aguarda confirmação do WhatsApp.",
    icon: Check,
    label: "Aceita",
  },
  sent: {
    className: "text-muted-strong",
    description: "O WhatsApp confirmou o envio da mensagem.",
    icon: Check,
    label: "Enviada",
  },
  delivered: {
    className: "text-muted-strong",
    description: "A mensagem chegou ao aparelho do contato.",
    icon: CheckCheck,
    label: "Entregue",
  },
  read: {
    className: "text-primary",
    description: "O contato abriu a mensagem.",
    icon: CheckCheck,
    label: "Lida",
  },
  failed: {
    className: "text-danger",
    description: "O canal confirmou que a mensagem não foi enviada.",
    icon: CircleAlert,
    label: "Falhou",
  },
};

export function SupportMessageDeliveryStatus({
  message,
}: {
  message: SupportMessage;
}) {
  if (
    message.direction !== "outbound"
    || message.deliveryStatus === "not_sent"
  ) {
    return <span>{supportMessageStatusLabels[message.status]}</span>;
  }

  const presentation = deliveryPresentations[message.deliveryStatus];
  const Icon = presentation.icon;

  return (
    <span
      aria-label={presentation.description}
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        presentation.className,
      )}
      title={presentation.description}
    >
      <Icon className="size-3" aria-hidden="true" />
      {presentation.label}
    </span>
  );
}
