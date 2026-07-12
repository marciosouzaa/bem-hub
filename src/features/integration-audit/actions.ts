"use server";

import { revalidatePath } from "next/cache";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseIntegrationAudit } from "./audit";

export type AuditActionState = { ok: boolean; message: string | null };

export async function saveIntegrationAuditAction(
  _state: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const parsed = parseIntegrationAudit({
    platform: formData.get("platform"), apiAccess: formData.get("apiAccess"),
    inventorySource: formData.get("inventorySource"), ordersSource: formData.get("ordersSource"),
    customersSource: formData.get("customersSource"), notes: formData.get("notes"),
  });
  if (!parsed.success) return { ok: false, message: "Preencha todas as origens operacionais." };

  const workspace = await getRequiredWorkspace();
  if (!(["owner", "admin"] as string[]).includes(workspace.membership.role)) {
    return { ok: false, message: "Apenas administradores registram a auditoria." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: readError } = await supabase.from("integrations")
    .select("id").eq("organization_id", workspace.organization.id)
    .eq("provider", "commerce_audit").limit(1).maybeSingle();
  if (readError) return { ok: false, message: `Falha ao buscar auditoria: ${readError.message}` };

  const payload = { config: parsed.data, status: "audited" };
  const result = existing
    ? await supabase.from("integrations").update(payload).eq("id", existing.id)
      .eq("organization_id", workspace.organization.id).select("id").single()
    : await supabase.from("integrations").insert({ organization_id: workspace.organization.id,
      provider: "commerce_audit", ...payload }).select("id").single();
  if (result.error) return { ok: false, message: `Falha ao salvar auditoria: ${result.error.message}` };
  revalidatePath("/app/settings/account");
  return { ok: true, message: "Auditoria operacional salva." };
}
