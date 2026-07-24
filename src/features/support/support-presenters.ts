import type {
  SupportConversation,
  SupportInboxItem,
  SupportMessage,
} from "@/features/support/queries";
import { formatContactPhone } from "@/features/contacts/phone-normalization";

export const supportStatusLabels: Record<
  SupportConversation["status"],
  string
> = {
  open: "Aberto",
  pending: "Pendente",
  escalated: "Escalado",
  resolved: "Resolvido",
};

export const supportPriorityLabels: Record<
  SupportConversation["priority"],
  string
> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const supportMessageStatusLabels: Record<
  SupportMessage["status"],
  string
> = {
  received: "Recebida",
  draft: "Rascunho",
  approved: "Aprovada",
  rejected: "Rejeitada",
  sending: "Enviando",
  sent: "Enviada",
  failed: "Falhou",
};

export function getSupportContactName(
  contact: Pick<SupportInboxItem["contact"], "name" | "phone" | "phoneStatus">,
) {
  if (contact.name?.trim()) return contact.name.trim();
  if (contact.phone) return formatContactPhone(contact.phone, contact.phoneStatus);
  return "Contato sem nome";
}

export function getContactInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  return initials || "CT";
}

export function formatSupportDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function formatSupportTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
