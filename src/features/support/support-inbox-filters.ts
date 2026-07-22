import type { SupportInboxItem } from "@/features/support/queries";

export type SupportInboxView =
  | "all"
  | "open"
  | "pending"
  | "escalated"
  | "resolved";

export function filterSupportInbox(
  items: SupportInboxItem[],
  query: string,
  view: SupportInboxView,
) {
  const normalizedQuery = normalizeSearch(query);

  return items.filter((item) => {
    if (view !== "all" && item.status !== view) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      item.contact.name,
      item.contact.phone,
      item.contact.email,
      item.channel.name,
      item.channel.phoneNumber,
      ...item.contact.tags,
    ]
      .filter(Boolean)
      .join(" ");

    return normalizeSearch(searchable).includes(normalizedQuery);
  });
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
