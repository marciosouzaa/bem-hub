import { AlertTriangle, CheckCircle2, Download, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailList } from "@/components/ui/detail-list";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { IdentityCell } from "@/components/ui/identity-cell";
import { MotionSurface } from "@/components/ui/motion";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeleteDocumentButton } from "@/features/knowledge-base/delete-document-button";
import type { KnowledgeDocumentListItem } from "@/features/knowledge-base/queries";

export function KnowledgeDocumentCard({ canManage, document }: { canManage: boolean; document: KnowledgeDocumentListItem }) {
  const status = getStatus(document.status);
  return <MotionSurface><Card><CardHeader className="gap-4 md:flex-row md:items-start md:justify-between md:space-y-0"><div className="min-w-0"><IdentityCell description={`${formatMimeType(document.mimeType)} · ${formatFileSize(document.fileSize)}`} title={<span className="flex flex-wrap items-center gap-2"><CardTitle className="max-w-full truncate text-lg">{document.name}</CardTitle>{document.sourceKind === "catalog" ? <StatusBadge variant="info">Catálogo v{document.catalogVersion ?? "processando"}{document.supersededAt ? " · histórico" : " · ativo"}</StatusBadge> : null}</span>} visual={<FileText className="size-5" />} /></div><div className="flex flex-col items-start gap-3 md:items-end"><StatusBadge icon={status.icon} variant={status.variant}>{status.label}</StatusBadge><div className="flex flex-wrap items-center gap-2 md:justify-end"><Button asChild size="sm" variant="secondary"><a aria-label={`Baixar ${document.name}`} href={`/api/knowledge/documents/${document.id}`}><Download className="size-4" />Baixar</a></Button>{canManage ? <DeleteDocumentButton documentId={document.id} documentName={document.name} /> : null}</div></div></CardHeader><CardContent className="space-y-4"><DetailList items={[{ label: "Chunks", value: document.chunkCount.toString() }, { label: "Modelo", value: document.embeddingModel ?? "Não definido" }, { label: "Criado em", value: new Intl.DateTimeFormat("pt-BR").format(new Date(document.createdAt)) }, { label: "Processado", value: document.processedAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit" }).format(new Date(document.processedAt)) : "Pendente" }]} />{document.error ? <FeedbackMessage variant="error">{document.error}</FeedbackMessage> : null}</CardContent></Card></MotionSurface>;
}

function getStatus(status: KnowledgeDocumentListItem["status"]) {
  if (status === "ready") return { icon: <CheckCircle2 className="size-3.5" />, label: "Pronto", variant: "success" as const };
  if (status === "failed") return { icon: <AlertTriangle className="size-3.5" />, label: "Falhou", variant: "danger" as const };
  return { icon: <Loader2 className="size-3.5" />, label: status === "processing" ? "Processando" : "Enviado", variant: "warning" as const };
}

function formatFileSize(size: number | null) {
  if (!size) return "tamanho não informado";
  return size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatMimeType(mimeType: string) {
  if (mimeType.includes("markdown")) return "Markdown";
  if (mimeType === "text/plain") return "TXT";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("wordprocessingml")) return "DOCX";
  return mimeType;
}
