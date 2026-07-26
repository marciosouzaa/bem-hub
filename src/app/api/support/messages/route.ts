import { z } from "zod";

import {
  retrySupportMessage,
  sendSupportMessage,
  SupportMessageSendError,
  supportMessageRequestSchema,
} from "@/features/support/send-support-message";

export async function POST(request: Request) {
  try {
    const input = supportMessageRequestSchema.parse(await request.json());
    const result = input.action === "send"
      ? await sendSupportMessage(input)
      : await retrySupportMessage(input);
    return Response.json(result, {
      status: result.status === "sending" ? 202 : result.duplicate ? 200 : 201,
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ message: "Revise a mensagem informada." }, { status: 400 });
    }
    if (error instanceof SupportMessageSendError) {
      return Response.json({ message: error.message }, { status: error.httpStatus });
    }
    return Response.json(
      { message: "Não foi possível enviar a mensagem." },
      { status: 500 },
    );
  }
}
