"use client";

import { FileText } from "lucide-react";

import type { ChatKnowledgeContext } from "@/features/chat/sources";

export function ChatKnowledgeCitations({ knowledge }: { knowledge: ChatKnowledgeContext | null }) {
  if (!knowledge) return null;
  if (knowledge.status !== "grounded") return <p className="mt-3 border-t border-panel-border pt-3 text-xs text-muted">{knowledge.status === "no_documents" ? "Base de conhecimento sem documentos prontos" : knowledge.status === "disabled" ? "Resposta sem consulta à base de conhecimento" : "Nenhuma evidência relevante encontrada na base"}</p>;
  return <div className="mt-3 border-t border-panel-border pt-3"><p className="flex items-center gap-2 text-xs font-medium text-muted-strong"><FileText aria-hidden="true" className="size-3.5 text-primary" />Fontes consultadas</p><ul className="mt-2 space-y-1.5">{knowledge.sources.map((source) => <li key={source.documentId}><a className="inline-flex max-w-full items-center gap-2 text-xs text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" href={`/api/knowledge/documents/${source.documentId}`} rel="noreferrer" target="_blank"><span className="truncate">{source.documentName}</span><span className="shrink-0 text-muted">{formatChunkReference(source.chunkIndexes, source.chunkCount)}</span></a></li>)}</ul></div>;
}

function formatChunkReference(chunkIndexes: number[], chunkCount: number) {
  if (!chunkIndexes.length) return `${chunkCount} ${chunkCount === 1 ? "trecho" : "trechos"}`;
  const references = chunkIndexes.map((chunkIndex) => chunkIndex + 1).join(", ");
  return `${chunkIndexes.length === 1 ? "Trecho" : "Trechos"} ${references}`;
}
