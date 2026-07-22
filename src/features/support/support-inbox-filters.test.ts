import { describe, expect, test } from "bun:test";

import type { SupportInboxItem } from "@/features/support/queries";
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
});

function makeItem({
  name,
  status,
  tags,
}: {
  name: string;
  status: SupportInboxItem["status"];
  tags: string[];
}): SupportInboxItem {
  return {
    id: crypto.randomUUID(),
    status,
    priority: "normal",
    lastMessageAt: "2026-07-22T12:00:00.000Z",
    assignedTo: null,
    contact: {
      id: crypto.randomUUID(),
      name,
      phone: "+55 11 99999-9999",
      email: null,
      tags,
    },
    channel: {
      id: crypto.randomUUID(),
      kind: "unofficial",
      provider: "uazapi",
      name: "WhatsApp Comercial",
      phoneNumber: "+55 11 98888-8888",
    },
  };
}
