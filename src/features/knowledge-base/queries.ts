import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText, serializeEmbedding } from "@/lib/ai/embeddings";
import type { EmbeddingRuntime } from "@/lib/ai/embeddings";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type KnowledgeDocumentListItem = {
  id: string;
  organizationId: string;
  knowledgeBaseId: string | null;
  name: string;
  filePath: string;
  mimeType: string;
  fileSize: number | null;
  status: Database["public"]["Enums"]["document_status"];
  error: string | null;
  chunkCount: number;
  embeddingModel: string | null;
  processedAt: string | null;
  createdBy: string;
  createdAt: string;
};

export type KnowledgeSearchResult = {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  similarity: number;
};

export async function listKnowledgeDocuments(
  supabase: Supabase,
  organizationId: string,
): Promise<KnowledgeDocumentListItem[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id,organization_id,knowledge_base_id,name,file_path,mime_type,file_size,status,error,chunk_count,embedding_model,processed_at,created_by,created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar documentos: ${error.message}`);
  }

  return data.map((document) => ({
    id: document.id,
    organizationId: document.organization_id,
    knowledgeBaseId: document.knowledge_base_id,
    name: document.name,
    filePath: document.file_path,
    mimeType: document.mime_type,
    fileSize: document.file_size,
    status: document.status,
    error: document.error,
    chunkCount: document.chunk_count,
    embeddingModel: document.embedding_model,
    processedAt: document.processed_at,
    createdBy: document.created_by,
    createdAt: document.created_at,
  }));
}

export async function searchKnowledgeDocuments(
  supabase: Supabase,
  organizationId: string,
  query: string,
  runtime: EmbeddingRuntime,
): Promise<KnowledgeSearchResult[]> {
  const embedding = await embedText(runtime, query);
  const { data, error } = await supabase.rpc("match_document_chunks", {
    target_organization_id: organizationId,
    query_embedding: serializeEmbedding(embedding),
    match_count: 8,
  });

  if (error) {
    throw new Error(`Falha na busca semantica: ${error.message}`);
  }

  const documentIds = [...new Set(data.map((item) => item.document_id))];

  if (!documentIds.length) {
    return [];
  }

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id,name")
    .eq("organization_id", organizationId)
    .in("id", documentIds);

  if (documentsError) {
    throw new Error(`Falha ao buscar fontes: ${documentsError.message}`);
  }

  const namesById = new Map(
    documents.map((document) => [document.id, document.name]),
  );

  return data.map((item) => ({
    id: item.id,
    documentId: item.document_id,
    documentName: namesById.get(item.document_id) ?? "Documento",
    content: item.content,
    similarity: item.similarity,
  }));
}

export function getKnowledgeStats(documents: KnowledgeDocumentListItem[]) {
  return {
    total: documents.length,
    ready: documents.filter((document) => document.status === "ready").length,
    processing: documents.filter((document) => document.status === "processing")
      .length,
    failed: documents.filter((document) => document.status === "failed").length,
    chunks: documents.reduce((sum, document) => sum + document.chunkCount, 0),
  };
}
