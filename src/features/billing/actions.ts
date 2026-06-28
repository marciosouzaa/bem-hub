"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlanKey } from "./plans";

const planKeySchema = z.enum(["free", "starter", "pro", "business"]);

export async function changeOrganizationPlanAction(formData: FormData) {
  const parsed = planKeySchema.safeParse(formData.get("planKey"));

  if (!parsed.success) {
    throw new Error("Plano inválido.");
  }

  const workspace = await getRequiredWorkspace();

  if (!["owner", "admin"].includes(workspace.membership.role)) {
    throw new Error("Apenas owners e admins podem alterar o plano.");
  }

  const supabase = await createSupabaseServerClient();
  const planKey: PlanKey = parsed.data;

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("key", planKey)
    .maybeSingle();

  if (planError) {
    throw new Error(`Falha ao buscar plano: ${planError.message}`);
  }

  if (!plan) {
    throw new Error("Plano não encontrado no banco.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      organization_id: workspace.organization.id,
      plan_id: plan.id,
      status: "manual",
      current_period_start: now,
      current_period_end: null,
      gateway: "manual",
      gateway_customer_id: null,
      gateway_subscription_id: null,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    throw new Error(`Falha ao alterar plano: ${error.message}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/chat");
  revalidatePath("/app/assistants");
  revalidatePath("/app/settings/billing");
  revalidatePath("/app/settings/account");
  revalidatePath("/app/upgrade");
}
