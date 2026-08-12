import { NextResponse } from "next/server";

import { sendSupportMedia } from "@/features/support/send-support-media";
import { SupportMessageSendError } from "@/features/support/support-message-delivery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Selecione um arquivo." }, { status: 400 });
    const result = await sendSupportMedia({
      caption: typeof formData.get("caption") === "string" ? String(formData.get("caption")) : "",
      clientRequestId: String(formData.get("clientRequestId") ?? ""),
      conversationId: String(formData.get("conversationId") ?? ""), file,
      replyToMessageId: typeof formData.get("replyToMessageId") === "string"
        ? String(formData.get("replyToMessageId"))
        : undefined,
    });
    return NextResponse.json(result, { status: result.status === "sending" ? 202 : result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof SupportMessageSendError || error instanceof Error ? error.message : "Não foi possível enviar o arquivo.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
