import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionSurface } from "@/components/ui/motion";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import type { KnowledgeSearchResult } from "@/features/knowledge-base/queries";

export function KnowledgeSearchResults({ error, query, results }: { error: string | null; query: string; results: KnowledgeSearchResult[] }) {
  return <MotionSurface><Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="size-4 text-primary" />Resultados para &quot;{query}&quot;</CardTitle></CardHeader><CardContent className="space-y-3">{error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : results.length ? results.map((result) => <div className="rounded-md border border-panel-border bg-panel-elevated p-4" key={result.id}><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">{result.documentName}</p><span className="font-mono text-xs text-primary">{(result.similarity * 100).toFixed(1)}% similar</span></div><p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-strong">{result.content}</p></div>) : <p className="text-sm text-muted-strong">Nenhum chunk pronto encontrou similaridade para esta busca.</p>}</CardContent></Card></MotionSurface>;
}
