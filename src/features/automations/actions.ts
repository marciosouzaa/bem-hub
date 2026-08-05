"use server";

import { generateText } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getEntitlementErrorMessage,
  getEntitlements,
  requireFeature,
} from "@/features/billing/entitlements";
import { getOrCreateWorkspace } from "@/features/organizations/bootstrap";
import { AiRuntimeError, resolveAssistantRuntime } from "@/lib/ai/runtime";
import { getGenerationTemperatureOptions } from "@/lib/ai/generation-options";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  automationTemplateIdSchema,
  getAutomationTemplate,
} from "./templates";

const inputSchema = z.object({
  templateId: automationTemplateIdSchema,
  input: z
    .string()
    .trim()
    .min(20, "Informe pelo menos 20 caracteres.")
    .max(12000, "Use no maximo 12.000 caracteres."),
});

export type AutomationActionState = {
  ok: boolean;
  message: string | null;
  output: string | null;
  errors?: { input?: string[]; templateId?: string[] };
};

export async function runAutomationAction(
  _previous: AutomationActionState,
  formData: FormData,
): Promise<AutomationActionState> {
  const parsed = inputSchema.safeParse({
    templateId: formData.get("templateId"),
    input: formData.get("input"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os campos da automacao.",
      output: null,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Sessao expirada.", output: null };
  }

  const workspace = await getOrCreateWorkspace(supabase, { user });
  const organizationId = workspace.organization.id;

  try {
    requireFeature(await getEntitlements(supabase, organizationId), "automations");
  } catch (error) {
    return {
      ok: false,
      message: getEntitlementErrorMessage(error) ?? "Automacoes indisponiveis.",
      output: null,
    };
  }

  const { data: assistant, error: assistantError } = await supabase
    .from("assistants")
    .select("id,provider,provider_connection_id,model")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (assistantError || !assistant) {
    return {
      ok: false,
      message: assistantError
        ? `Falha ao buscar assistente: ${assistantError.message}`
        : "Defina um assistente padrao antes de executar automacoes.",
      output: null,
    };
  }

  const template = getAutomationTemplate(parsed.data.templateId);
  const { data: run, error: runError } = await supabase
    .from("automation_runs")
    .insert({
      organization_id: organizationId,
      automation_id: null,
      status: "running",
      input: {
        template_id: template.id,
        content: parsed.data.input,
      },
      output: null,
      error: null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (runError) {
    return {
      ok: false,
      message: `Falha ao iniciar automacao: ${runError.message}`,
      output: null,
    };
  }

  try {
    const runtime = await resolveAssistantRuntime(
      supabase,
      organizationId,
      assistant,
    );
    const generated = await generateText({
      model: runtime.languageModel,
      system: template.system,
      prompt: parsed.data.input,
      ...getGenerationTemperatureOptions(runtime.provider, runtime.model, 0.3),
    });
    const { data: updatedRun, error: updateError } = await supabase
      .from("automation_runs")
      .update({
        status: "succeeded",
        output: {
          text: generated.text,
          model: runtime.model,
          provider: runtime.provider,
        },
        error: null,
      })
      .eq("id", run.id)
      .eq("organization_id", organizationId)
      .eq("created_by", user.id)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedRun) {
      throw new Error(updateError?.message ?? "Run nao foi atualizado.");
    }

    const { error: usageError } = await supabase.from("usage_events").insert({
      organization_id: organizationId,
      user_id: user.id,
      event_type: "automation.completed",
      model: runtime.model,
      tokens_input: generated.usage.inputTokens ?? null,
      tokens_output: generated.usage.outputTokens ?? null,
      metadata: {
        run_id: run.id,
        template_id: template.id,
        provider: runtime.provider,
      },
    });

    if (usageError) {
      console.error("Falha ao registrar uso da automacao", usageError);
    }
    revalidatePath("/app/automations");

    return {
      ok: true,
      message: "Automacao concluida. Revise o resultado antes de usar.",
      output: generated.text,
    };
  } catch (error) {
    console.error("Falha ao executar automacao manual", error);
    const message =
      error instanceof AiRuntimeError
        ? error.message
        : "Falha ao gerar ou persistir o resultado.";
    await supabase
      .from("automation_runs")
      .update({ status: "failed", error: message })
      .eq("id", run.id)
      .eq("organization_id", organizationId)
      .eq("created_by", user.id);
    revalidatePath("/app/automations");
    return { ok: false, message: `Falha na automacao: ${message}`, output: null };
  }
}
