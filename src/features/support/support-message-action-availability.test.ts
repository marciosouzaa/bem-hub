import { describe, expect, test } from "bun:test";

import type { SupportConversation } from "@/features/support/queries";
import {
  getSupportMessageActionAvailability,
  getSupportMessageDisplayState,
} from "@/features/support/support-message-action-availability";

describe("support message action availability", () => {
  test("enables safe actions for confirmed text with available attachment", () => {
    const message = makeMessage({
      attachments: [makeAttachment({ status: "available" })],
      canReply: true,
      content: "Segue comprovante",
    });

    expect(getSupportMessageActionAvailability(message)).toMatchObject({
      canCopy: true,
      canDelete: false,
      canDownload: true,
      canEdit: false,
      canReply: true,
    });
  });

  test("does not copy synthetic media placeholder", () => {
    const message = makeMessage({
      attachments: [makeAttachment({ status: "available" })],
      content: "Mídia recebida",
    });

    expect(getSupportMessageActionAvailability(message).canCopy).toBe(false);
    expect(getSupportMessageDisplayState(message).showContent).toBe(false);
  });

  test("downloads only available attachments and keeps failed media unavailable", () => {
    const available = makeAttachment({
      id: "11111111-1111-4111-8111-111111111111",
      status: "available",
    });
    const failed = makeAttachment({
      id: "22222222-2222-4222-8222-222222222222",
      status: "failed",
    });
    const message = makeMessage({ attachments: [available, failed] });

    expect(
      getSupportMessageActionAvailability(message).downloadableAttachments,
    ).toEqual([available]);
  });

  test("hides file-name fallback when media preview already represents it", () => {
    const message = makeMessage({
      attachments: [makeAttachment({ fileName: "contrato.pdf" })],
      content: "Arquivo: contrato.pdf",
    });

    expect(getSupportMessageDisplayState(message)).toEqual({
      hidesAttachmentFallback: true,
      showContent: false,
    });
  });
});

function makeMessage(
  overrides: Partial<SupportConversation["messages"][number]> = {},
): SupportConversation["messages"][number] {
  return {
    acceptedAt: null,
    attachments: [],
    canReply: false,
    content: "Mensagem",
    createdAt: "2026-08-18T12:00:00.000Z",
    deliveredAt: null,
    deliveryFailedAt: null,
    deliveryStatus: "not_sent",
    deliveryUpdatedAt: null,
    direction: "inbound",
    id: "33333333-3333-4333-8333-333333333333",
    readAt: null,
    replyTo: null,
    sentAt: null,
    status: "received",
    ...overrides,
  };
}

function makeAttachment(
  overrides: Partial<SupportConversation["messages"][number]["attachments"][number]> = {},
): SupportConversation["messages"][number]["attachments"][number] {
  return {
    byteSize: 1024,
    fileName: "arquivo.pdf",
    id: "44444444-4444-4444-8444-444444444444",
    mediaType: "document",
    mimeType: "application/pdf",
    status: "available",
    ...overrides,
  };
}
