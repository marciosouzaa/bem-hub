import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
  assistant: z
    .object({
      name: z.string().optional(),
      instructions: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY nao configurada. Copie .env.example para .env.local e informe sua chave.",
      },
      { status: 400 },
    );
  }

  const body = chatRequestSchema.safeParse(await request.json());

  if (!body.success) {
    return Response.json(
      { error: "Payload invalido.", issues: body.error.issues },
      { status: 400 },
    );
  }

  const model =
    body.data.assistant?.model ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-5.5";

  const result = streamText({
    model: openai.responses(model),
    system:
      body.data.assistant?.instructions ??
      "Voce e um assistente corporativo do BEM HUB. Responda com clareza, cite limites quando faltar contexto e evite inventar dados.",
    messages: await convertToModelMessages(body.data.messages),
  });

  return result.toUIMessageStreamResponse();
}
