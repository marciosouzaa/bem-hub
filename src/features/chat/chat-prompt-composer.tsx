"use client";

import { SendHorizontal, Square } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";

export function ChatPromptComposer({ assistantCount, canSend, disabled, input, isStreaming, onChange, onStop, onSubmit, remainingMessages }: { assistantCount: number; canSend: boolean; disabled: boolean; input: string; isStreaming: boolean; onChange: (value: string) => void; onStop: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; remainingMessages: number }) {
  return <form className="border-t border-panel-border bg-panel-subtle p-4" onSubmit={onSubmit}><div className="flex gap-3"><textarea className="max-h-40 min-h-12 flex-1 resize-none rounded-md border border-panel-border bg-panel px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus:border-primary disabled:cursor-not-allowed disabled:opacity-70" disabled={disabled} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={getPlaceholder(assistantCount, remainingMessages)} value={input} />{isStreaming ? <Button aria-label="Interromper resposta" onClick={onStop} size="icon" type="button" variant="secondary"><Square className="size-4" /></Button> : <Button aria-label="Enviar mensagem" disabled={!canSend} size="icon" type="submit"><SendHorizontal className="size-4" /></Button>}</div></form>;
}

function getPlaceholder(assistantCount: number, remainingMessages: number) {
  if (!assistantCount) return "Crie um assistente antes de iniciar o chat.";
  if (remainingMessages <= 0) return "Limite mensal atingido.";
  return "Digite uma pergunta para o assistente...";
}
