import { NextResponse } from "next/server";
import { KNOWLEDGE_BUCKET } from "@/features/knowledge-base/constants";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
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

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,name,file_path")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json(
      { error: `Falha ao buscar documento: ${documentError.message}` },
      { status: 500 },
    );
  }

  if (!document) {
    return NextResponse.json(
      { error: "Documento nao encontrado." },
      { status: 404 },
    );
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .createSignedUrl(document.file_path, 300, {
      download: document.name,
    });

  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json(
      {
        error: `Falha ao gerar link de download: ${
          signedUrlError?.message ?? "URL indisponivel."
        }`,
      },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
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
      { error: "Apenas owners e admins podem excluir documentos." },
      { status: 403 },
    );
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,file_path")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json(
      { error: `Falha ao buscar documento: ${documentError.message}` },
      { status: 500 },
    );
  }

  if (!document) {
    return NextResponse.json(
      { error: "Documento nao encontrado." },
      { status: 404 },
    );
  }

  const { error: storageError } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .remove([document.file_path]);

  if (storageError) {
    return NextResponse.json(
      { error: `Falha ao remover arquivo: ${storageError.message}` },
      { status: 500 },
    );
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("organization_id", organizationId);

  if (deleteError) {
    return NextResponse.json(
      { error: `Falha ao excluir documento: ${deleteError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Documento excluido." });
}
