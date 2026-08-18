import type { SupportInboxItem } from "@/features/support/queries";

export type SupportInboxView =
  | "all"
  | "assigned"
  | "groups"
  | "mine"
  | "open"
  | "resolved";

export type SupportInboxSort = "oldest" | "recent" | "unread";

export type SupportInboxFilters = {
  assignee?: string;
  channelId?: string;
  includeGroups?: boolean;
  query: string;
  sort?: SupportInboxSort;
  tag?: string;
  view: SupportInboxView;
  viewerId: string;
};

export function filterSupportInbox(
  items: SupportInboxItem[],
  queryOrFilters: string | SupportInboxFilters,
  legacyView?: SupportInboxView,
) {
  const filters = typeof queryOrFilters === "string"
    ? {
      assignee: "all",
      channelId: "all",
      includeGroups: true,
      query: queryOrFilters,
      sort: "recent" as const,
      tag: "all",
      view: legacyView ?? "all",
      viewerId: "",
    }
    : queryOrFilters;
  const normalizedQuery = normalizeSearch(filters.query);

  return items
    .filter((item) => {
      if (!matchesView(item, filters)) return false;
      if (filters.channelId && filters.channelId !== "all" && item.channel.id !== filters.channelId) {
        return false;
      }
      if (filters.assignee === "unassigned" && item.assignedTo) return false;
      if (
        filters.assignee
        && !["all", "unassigned"].includes(filters.assignee)
        && item.assignedTo !== filters.assignee
      ) {
        return false;
      }
      if (
        filters.tag
        && filters.tag !== "all"
        && !item.contact.tags.includes(filters.tag)
      ) {
        return false;
      }
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
  })
    .sort((left, right) => sortInboxItem(left, right, filters.sort ?? "recent"));
}

function matchesView(item: SupportInboxItem, filters: SupportInboxFilters) {
  if (filters.view === "all") return true;
  if (filters.view === "resolved") return item.status === "resolved";
  if (filters.view === "mine") {
    return item.status !== "resolved" && Boolean(filters.viewerId) && item.assignedTo === filters.viewerId;
  }
  if (filters.view === "assigned") {
    return item.status !== "resolved" && item.assignedTo !== null;
  }
  if (filters.view === "groups") return false;
  return item.status !== "resolved";
}

function sortInboxItem(
  left: SupportInboxItem,
  right: SupportInboxItem,
  sort: SupportInboxSort,
) {
  if (sort === "unread") {
    const byUnread = right.unreadCount - left.unreadCount;
    if (byUnread !== 0) return byUnread;
  }
  const leftTime = new Date(left.lastMessageAt).getTime();
  const rightTime = new Date(right.lastMessageAt).getTime();
  return sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
