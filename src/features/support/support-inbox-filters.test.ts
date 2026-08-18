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
    expect(filterSupportInbox([item], "cliente", "all")).toHaveLength(1);
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
});

function makeItem({
  assignedTo = null,
  name,
  status,
  tags,
}: {
  assignedTo?: string | null;
  name: string;
  status: SupportInboxItem["status"];
  tags: string[];
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
    contact: {
      avatarUrl: null,
      id: crypto.randomUUID(),
      name,
      phone: "+55 11 99999-9999",
      email: null,
      phoneReason: null,
      phoneStatus: "valid",
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
  };
}
