import { z } from "zod";

import {
  startSupportConversation,
  SupportConversationStartError,
} from "@/features/support/start-support-conversation";
import {
  supportConversationStartRequestSchema,
} from "@/features/support/start-support-conversation-contracts";

export async function POST(request: Request) {
  try {
    const input = supportConversationStartRequestSchema.parse(
      await request.json(),
    );
    const result = await startSupportConversation(input);
    return Response.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json(
        { message: "Revise telefone e primeira mensagem." },
        { status: 400 },
      );
    }
    if (error instanceof SupportConversationStartError) {
      return Response.json(
        {
          conversationId: error.conversationId,
          message: error.message,
        },
        { status: error.httpStatus },
      );
    }
    return Response.json(
      { message: "Não foi possível iniciar o atendimento." },
      { status: 500 },
    );
  }
}
