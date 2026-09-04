"use client";

import { usePathname } from "next/navigation";
import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";

import type { ChannelConnection } from "@/features/channels/channel-schema";
import type { SupportInboxItem as SupportInboxItemData } from "@/features/support/queries";
import { filterSupportInbox, type SupportInboxSort, type SupportInboxView } from "@/features/support/support-inbox-filters";
import { SupportInboxList } from "@/features/support/support-inbox-list";
import { SupportInboxTabs } from "@/features/support/support-inbox-tabs";
import { SupportInboxToolbar } from "@/features/support/support-inbox-toolbar";
import { SupportStartDrawer } from "@/features/support/support-start-drawer";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 768px)";
const SUPPORT_INBOX_WIDTH = 390;

function subscribeToViewport(callback: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getDesktopSnapshot() { return window.matchMedia(DESKTOP_QUERY).matches; }
function getDesktopServerSnapshot() { return true; }

export function SupportInboxShell({ children, channels, conversations, viewerId }: {
  children: React.ReactNode;
  channels: ChannelConnection[];
  conversations: SupportInboxItemData[];
  viewerId: string;
}) {
  const pathname = usePathname();
  const [assignee, setAssignee] = useState("all");
  const [channelId, setChannelId] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [includeGroups, setIncludeGroups] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SupportInboxSort>("recent");
  const [startDrawerOpen, setStartDrawerOpen] = useState(false);
  const [tag, setTag] = useState("all");
  const [view, setView] = useState<SupportInboxView>("open");
  const deferredQuery = useDeferredValue(query);
  const desktop = useSyncExternalStore(subscribeToViewport, getDesktopSnapshot, getDesktopServerSnapshot);
  const hasSelection = pathname !== "/app/support";

  const assignees = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    for (const item of conversations) if (item.assignee) byId.set(item.assignee.id, { id: item.assignee.id, label: item.assignee.name ?? item.assignee.email ?? "Atendente" });
    return [...byId.values()].sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  }, [conversations]);
  const tags = useMemo(() => [...new Set(conversations.flatMap((item) => item.contact.tags))].sort((left, right) => left.localeCompare(right, "pt-BR")), [conversations]);
  const counts = useMemo(() => ({
    assigned: conversations.filter((item) => item.status !== "resolved" && item.assignedTo !== null).length,
    groups: 0,
    mine: conversations.filter((item) => item.status !== "resolved" && item.assignedTo === viewerId).length,
    open: conversations.filter((item) => item.status !== "resolved").length,
    resolved: conversations.filter((item) => item.status === "resolved").length,
    unread: conversations.filter((item) => item.status !== "resolved" && item.unreadCount > 0).length,
  }), [conversations, viewerId]);
  const filteredConversations = useMemo(() => filterSupportInbox(conversations, { assignee, channelId, includeGroups, query: deferredQuery, sort, tag, view, viewerId }), [assignee, channelId, conversations, deferredQuery, includeGroups, sort, tag, view, viewerId]);
  const inboxStyle = desktop ? { flexBasis: SUPPORT_INBOX_WIDTH, maxWidth: SUPPORT_INBOX_WIDTH, width: SUPPORT_INBOX_WIDTH } : undefined;

  function toggleGroups() {
    setIncludeGroups((enabled) => {
      const next = !enabled;
      if (!next && view === "groups") setView("open");
      return next;
    });
  }

  return <>
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 w-full max-w-full overflow-hidden bg-background">
      <aside aria-label="Fila de atendimentos" className={cn("min-h-0 w-full min-w-0 shrink-0 flex-col border-r border-panel-border bg-panel-subtle", hasSelection ? "hidden md:flex" : "flex")} style={inboxStyle}>
        <SupportInboxToolbar assignee={assignee} assignees={assignees} channelId={channelId} channels={channels} filtersOpen={filtersOpen} includeGroups={includeGroups} onAssigneeChange={setAssignee} onChannelChange={setChannelId} onFiltersOpenChange={setFiltersOpen} onGroupsToggle={toggleGroups} onQueryChange={setQuery} onSortChange={setSort} onStart={() => setStartDrawerOpen(true)} onTagChange={setTag} query={query} sort={sort} tag={tag} tags={tags} unreadCount={conversations.reduce((total, item) => total + item.unreadCount, 0)} />
        <SupportInboxTabs counts={counts} includeGroups={includeGroups} onViewChange={setView} view={view} />
        <SupportInboxList conversations={filteredConversations} pathname={pathname} viewerId={viewerId} />
      </aside>
      <section className={cn("min-h-0 min-w-0 flex-1 bg-background", hasSelection ? "block" : "hidden md:block")}>{children}</section>
    </div>
    <SupportStartDrawer channels={channels} onClose={() => setStartDrawerOpen(false)} open={startDrawerOpen} />
  </>;
}
