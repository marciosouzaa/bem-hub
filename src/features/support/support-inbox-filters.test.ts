import { describe, expect, test } from "bun:test";

import {
  supportInboxItemSchema,
  type SupportInboxItem,
} from "@/features/support/queries";
import { filterSupportInbox } from "@/features/support/support-inbox-filters";

const items = [
  makeItem({ name: "Clínica São Bento", status: "open", tags: ["VIP"] }),
  makeItem({ name: "Loja Horizonte", status: "resolved", tags: ["Revenda"] }),
];

describe("support inbox filters", () => {
  test("filters by operational status", () => {
    expect(filterSupportInbox(items, "", "open")).toHaveLength(1);
    expect(filterSupportInbox(items, "", "resolved")[0]?.contact.name).toBe(
      "Loja Horizonte",
    );
  });

  test("searches names and tags without accents or case", () => {
    expect(filterSupportInbox(items, "clinica", "all")).toHaveLength(1);
    expect(filterSupportInbox(items, "revenda", "all")).toHaveLength(1);
  });

  test("accepts a managed channel whose own number is not identified", () => {
    const item = supportInboxItemSchema.parse({
      assignedTo: null,
      assignee: null,
      channel: {
        deletedAt: null,
        id: crypto.randomUUID(),
        kind: "unofficial",
        name: "WhatsApp gerenciado",
        operationalStatus: "connected",
        phoneNumber: null,
        provider: "wuzapi",
      },
      contact: {
        email: null,
        id: crypto.randomUUID(),
        name: "Cliente teste",
        phone: "+55 11 99999-9999",
        tags: [],
      },
      id: crypto.randomUUID(),
      lastMessageAt: "2026-07-30T03:15:31.000Z",
      priority: "normal",
      status: "open",
      unreadCount: 0,
    });

    expect(item.channel.phoneNumber).toBeNull();
    expect(item.department).toBeNull();
    expect(item.isPinned).toBe(false);
    expect(filterSupportInbox([item], "cliente", "all")).toHaveLength(1);
  });

  test("accepts operator state and department-ready fields", () => {
    const departmentId = crypto.randomUUID();
    const defaultAssistantId = crypto.randomUUID();
    const item = supportInboxItemSchema.parse({
      ...makeItem({ name: "Cliente fixado", status: "open", tags: [] }),
      departmentId,
      department: {
        defaultAssistantId,
        id: departmentId,
        name: "Comercial",
      },
      isPinned: true,
      markedUnreadAt: "2026-08-19T10:00:00.000Z",
      pinnedAt: "2026-08-19T09:00:00.000Z",
      unreadCount: 1,
    });

    expect(item.department?.defaultAssistantId).toBe(defaultAssistantId);
    expect(item.isPinned).toBe(true);
    expect(item.markedUnreadAt).toBe("2026-08-19T10:00:00.000Z");
  });

  test("filters assigned, mine and unassigned queues", () => {
    const viewerId = crypto.randomUUID();
    const assigned = makeItem({
      assignedTo: viewerId,
      name: "Cliente atendido",
      status: "open",
      tags: [],
    });
    const unassigned = makeItem({
      assignedTo: null,
      name: "Cliente aberto",
      status: "pending",
      tags: [],
    });

    expect(filterSupportInbox([assigned, unassigned], {
      query: "",
      view: "assigned",
      viewerId,
    })).toEqual([assigned]);
    expect(filterSupportInbox([assigned, unassigned], {
      assignee: "unassigned",
      query: "",
      view: "open",
      viewerId,
    })).toEqual([unassigned]);
    expect(filterSupportInbox([assigned, unassigned], {
      query: "",
      view: "mine",
      viewerId,
    })).toEqual([assigned]);
  });

  test("filters unread conversations", () => {
    const unread = makeItem({
      name: "Cliente com retorno",
      status: "open",
      tags: [],
      unreadCount: 2,
    });
    const read = makeItem({
      name: "Cliente lido",
      status: "open",
      tags: [],
      unreadCount: 0,
    });

    expect(filterSupportInbox([read, unread], {
      query: "",
      view: "unread",
      viewerId: "",
    })).toEqual([unread]);
  });

  test("keeps manually marked unread conversations in unread view", () => {
    const manualUnread = {
      ...makeItem({
        name: "Cliente marcado",
        status: "open",
        tags: [],
        unreadCount: 1,
      }),
      markedUnreadAt: "2026-08-19T10:00:00.000Z",
    };

    expect(filterSupportInbox([manualUnread], {
      query: "",
      view: "unread",
      viewerId: "",
    })).toEqual([manualUnread]);
  });

  test("keeps pinned conversations above normal rows inside active filters", () => {
    const normalUnread = makeItem({
      name: "Cliente normal",
      status: "open",
      tags: [],
      unreadCount: 8,
    });
    const pinnedUnread = makeItem({
      isPinned: true,
      name: "Cliente fixado",
      status: "open",
      tags: [],
      unreadCount: 1,
    });

    expect(filterSupportInbox([normalUnread, pinnedUnread], {
      query: "",
      sort: "unread",
      view: "unread",
      viewerId: "",
    })).toEqual([pinnedUnread, normalUnread]);
  });
});

function makeItem({
  assignedTo = null,
  isPinned = false,
  name,
  status,
  tags,
  unreadCount = 0,
}: {
  assignedTo?: string | null;
  isPinned?: boolean;
  name: string;
  status: SupportInboxItem["status"];
  tags: string[];
  unreadCount?: number;
}): SupportInboxItem {
  return {
    id: crypto.randomUUID(),
    status,
    priority: "normal",
    lastMessageAt: "2026-07-22T12:00:00.000Z",
    assignedTo,
    assignee: assignedTo
      ? { email: "ana@example.com", id: assignedTo, name: "Ana" }
      : null,
    department: null,
    departmentId: null,
    isPinned,
    markedUnreadAt: null,
    pinnedAt: null,
    contact: {
      avatarUrl: null,
      id: crypto.randomUUID(),
      name,
      phone: "+55 11 99999-9999",
      email: null,
      phoneReason: null,
      phoneStatus: "supported",
      tags,
    },
    channel: {
      deletedAt: null,
      id: crypto.randomUUID(),
      kind: "unofficial",
      operationalStatus: "connected",
      provider: "uazapi",
      name: "WhatsApp Comercial",
      phoneNumber: "+55 11 98888-8888",
    },
    unreadCount,
  };
}
