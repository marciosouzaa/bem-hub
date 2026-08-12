import { describe, expect, test } from "bun:test";

import { getSupportReplyPreview } from "@/features/support/support-reply-preview-details";

const imageReply = {
  attachments: [{
    byteSize: 1200,
    fileName: "foto.jpg",
    id: "11111111-1111-4111-8111-111111111111",
    mediaType: "image" as const,
    mimeType: "image/jpeg",
    status: "available" as const,
  }],
  content: "Mídia recebida",
  direction: "inbound" as const,
  id: "22222222-2222-4222-8222-222222222222",
};

describe("support reply preview", () => {
  test("descreve mídia sem repetir o placeholder de ingestão", () => {
    expect(getSupportReplyPreview(imageReply)).toMatchObject({
      content: null,
      mediaLabel: "Foto",
      sourceLabel: "Contato",
    });
  });

  test("preserva legenda real e identifica a origem da equipe", () => {
    expect(getSupportReplyPreview({
      ...imageReply,
      content: "Confira este erro no aparelho",
      direction: "outbound",
    })).toMatchObject({
      content: "Confira este erro no aparelho",
      mediaLabel: "Foto",
      sourceLabel: "Equipe",
    });
  });
});
