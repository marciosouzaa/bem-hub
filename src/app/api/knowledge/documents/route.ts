import { NextResponse } from "next/server";
import {
  EntitlementError,
  getEntitlementErrorMessage,
  getEntitlements,
  requireFeature,
  requireLimitAvailable,
} from "@/features/billing/entitlements";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import {
  KNOWLEDGE_BUCKET,
  MAX_DOCUMENT_SIZE_BYTES,
} from "@/features/knowledge-base/constants";
import {
  chunkDocumentText,
  extractDocumentText,
  isAcceptedDocument,
  sanitizeStorageFilename,
} from "@/features/knowledge-base/processing";
import {
  embedTexts,
  resolveOpenAIEmbeddingRuntime,
  serializeEmbeddingBatch,
} from "@/lib/ai/embeddings";
import { DEFAULT_EMBEDDING_MODEL } from "@/lib/ai/models";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Sessao expirada." }, { status: 401 });
  }

  const workspace = await getOrCreateWorkspace(supabase, { user });
  const organizationId = workspace.organization.id;

  if (!["owner", "admin"].includes(workspace.membership.role)) {
    return NextResponse.json(
      { error: "Apenas owners e admins podem enviar documentos." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Envie um arquivo valido." },
      { status: 400 },
    );
  }

  if (!isAcceptedDocument(file)) {
    return NextResponse.json(
      { error: "Formato nao suportado. Use PDF, DOCX, TXT, Markdown, CSV ou TSV." },
      { status: 400 },
    );
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Arquivo acima do limite de 6 MB." },
      { status: 413 },
    );
  }

  const { count, error: countError } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (countError) {
    return NextResponse.json(
      { error: `Falha ao validar limite: ${countError.message}` },
      { status: 500 },
    );
  }

  try {
    const entitlements = await getEntitlements(supabase, organizationId);
    requireFeature(entitlements, "knowledgeBase");
    requireLimitAvailable(entitlements, "documents", count ?? 0);
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        {
          error:
            getEntitlementErrorMessage(error) ??
            "Plano atual nao permite base de conhecimento.",
          code: error.code,
          plan: error.planKey,
          limit: error.limit,
          used: error.used,
        },
        { status: error.code === "feature_disabled" ? 403 : 402 },
      );
    }

    throw error;
  }

  const documentId = crypto.randomUUID();
  const filePath = `${organizationId}/${documentId}/${sanitizeStorageFilename(
    file.name,
  )}`;
  const knowledgeBaseId = await getOrCreateDefaultKnowledgeBase(
    organizationId,
  );

  const { error: uploadError } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Falha ao enviar arquivo: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    organization_id: organizationId,
    knowledge_base_id: knowledgeBaseId,
    name: file.name,
    file_path: filePath,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
    status: "processing",
    chunk_count: 0,
    embedding_model: DEFAULT_EMBEDDING_MODEL,
    created_by: user.id,
  });

  if (insertError) {
    await supabase.storage.from(KNOWLEDGE_BUCKET).remove([filePath]);

    return NextResponse.json(
      { error: `Falha ao registrar documento: ${insertError.message}` },
      { status: 500 },
    );
  }

  try {
    const text = await extractDocumentText(file);
    const chunks = chunkDocumentText(text);

    if (!chunks.length) {
      throw new Error("Nenhum texto util foi encontrado no documento.");
    }

    const runtime = await resolveOpenAIEmbeddingRuntime(supabase, organizationId);
    const embeddings = await embedTexts(
      runtime,
      chunks.map((chunk) => chunk.content),
    );

    const serializedEmbeddings = serializeEmbeddingBatch(
      embeddings,
      chunks.length,
    );

    const { error: chunksError } = await supabase.from("document_chunks").insert(
      chunks.map((chunk, index) => ({
        organization_id: organizationId,
        document_id: documentId,
        content: chunk.content,
        chunk_index: chunk.chunkIndex,
        token_count: chunk.tokenCount,
        embedding: serializedEmbeddings[index],
      })),
    );

    if (chunksError) {
      throw new Error(`Falha ao salvar chunks: ${chunksError.message}`);
    }

    const { error: readyError } = await supabase
      .from("documents")
      .update({
        status: "ready",
        error: null,
        chunk_count: chunks.length,
        embedding_model: runtime.model,
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("organization_id", organizationId);

    if (readyError) {
      throw new Error(`Falha ao concluir documento: ${readyError.message}`);
    }

    const { error: usageError } = await supabase.from("usage_events").insert({
      organization_id: organizationId,
      user_id: user.id,
      event_type: "knowledge.document_ingested",
      model: runtime.model,
      tokens_input: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
      metadata: {
        document_id: documentId,
        chunks: chunks.length,
        provider: "openai",
        provider_connection_id: runtime.providerConnectionId,
      },
    });

    if (usageError) {
      console.error("Falha ao registrar uso da ingestao", usageError);
    }

    return NextResponse.json({
      documentId,
      message: "Documento processado e pronto para busca semantica.",
      status: "ready",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao processar documento.";

    const { error: cleanupError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId)
      .eq("organization_id", organizationId);

    if (cleanupError) {
      console.error("Falha ao limpar chunks do documento", cleanupError);
    }

    const { error: failedStatusError } = await supabase
      .from("documents")
      .update({
        status: "failed",
        error: message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("organization_id", organizationId);

    if (failedStatusError) {
      console.error("Falha ao marcar documento como failed", failedStatusError);
    }

    return NextResponse.json(
      {
        documentId,
        error: message,
        status: "failed",
      },
      { status: 422 },
    );
  }

  async function getOrCreateDefaultKnowledgeBase(targetOrganizationId: string) {
    const { data: existing, error: existingError } = await supabase
      .from("knowledge_bases")
      .select("id")
      .eq("organization_id", targetOrganizationId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Falha ao buscar base: ${existingError.message}`);
    }

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from("knowledge_bases")
      .insert({
        organization_id: targetOrganizationId,
        name: "Base geral",
        description: "Documentos oficiais do workspace.",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Falha ao criar base: ${error.message}`);
    }

    return data.id;
  }
}
