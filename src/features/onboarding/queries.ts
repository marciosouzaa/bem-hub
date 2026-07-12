import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type OnboardingStep = {
  id: "assistant" | "knowledge" | "conversation";
  title: string;
  description: string;
  href: string;
  action: string;
  complete: boolean;
};

export type OnboardingProgress = {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  percent: number;
  nextStep: OnboardingStep | null;
};

export async function getOnboardingProgress(
  supabase: Supabase,
  organizationId: string,
): Promise<OnboardingProgress> {
  const [assistants, documents, conversations] = await Promise.all([
    supabase
      .from("assistants")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "ready"),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  const error = assistants.error ?? documents.error ?? conversations.error;

  if (error) {
    throw new Error(`Falha ao calcular onboarding: ${error.message}`);
  }

  return buildOnboardingProgress({
    hasAssistant: (assistants.count ?? 0) > 0,
    hasReadyDocument: (documents.count ?? 0) > 0,
    hasConversation: (conversations.count ?? 0) > 0,
  });
}

export function buildOnboardingProgress(input: {
  hasAssistant: boolean;
  hasReadyDocument: boolean;
  hasConversation: boolean;
}): OnboardingProgress {
  const steps: OnboardingStep[] = [
    {
      id: "assistant",
      title: "Configure o assistente oficial",
      description: "Defina papel, linguagem e instrucoes da sua empresa.",
      href: "/app/assistants",
      action: "Configurar assistente",
      complete: input.hasAssistant,
    },
    {
      id: "knowledge",
      title: "Adicione conhecimento da empresa",
      description: "Envie ao menos um documento para fundamentar respostas.",
      href: "/app/knowledge",
      action: "Enviar documento",
      complete: input.hasReadyDocument,
    },
    {
      id: "conversation",
      title: "Faca a primeira pergunta util",
      description: "Confirme resposta e fonte dentro do fluxo real de trabalho.",
      href: "/app/chat",
      action: "Abrir conversa",
      complete: input.hasConversation,
    },
  ];
  const completed = steps.filter((step) => step.complete).length;

  return {
    steps,
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
    nextStep: steps.find((step) => !step.complete) ?? null,
  };
}
