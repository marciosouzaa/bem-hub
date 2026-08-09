import { NextResponse } from "next/server";

import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  const workspace = await getOrCreateWorkspace(supabase, { user });
  const { attachmentId } = await params;
  const { data, error } = await supabase
    .from("support_message_attachments")
    .select("storage_bucket,storage_object_path")
    .eq("id", attachmentId)
    .eq("organization_id", workspace.organization.id)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ message: "Arquivo não encontrado." }, { status: 404 });
  const { data: signed, error: signError } = await supabase.storage
    .from(data.storage_bucket)
    .createSignedUrl(data.storage_object_path, 60);
  if (signError || !signed) return NextResponse.json({ message: "Arquivo indisponível." }, { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
