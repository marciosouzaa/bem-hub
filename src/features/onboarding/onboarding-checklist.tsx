import { Check, ChevronRight, Circle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OnboardingProgress } from "./queries";

export function OnboardingChecklist({
  organizationName,
  progress,
}: {
  organizationName: string;
  progress: OnboardingProgress;
}) {
  if (!progress.nextStep) {
    return null;
  }

  return (
    <Card className="ai-premium-surface overflow-hidden border-primary/30">
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Primeiros 15 minutos
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Coloque {organizationName} para operar
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-strong">
              Complete o fluxo essencial para obter uma resposta fundamentada
              nos documentos da empresa.
            </p>
          </div>

          <div className="min-w-40">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Progresso</span>
              <span className="font-mono text-primary">
                {progress.completed}/{progress.total}
              </span>
            </div>
            <div
              aria-label={`${progress.percent}% do onboarding concluido`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress.percent}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-elevated"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        </div>

        <ol className="mt-6 grid gap-3 lg:grid-cols-3">
          {progress.steps.map((step) => (
            <li
              className="rounded-[var(--radius-control)] border border-panel-border bg-panel-subtle/80 p-4"
              key={step.id}
            >
              <div className="flex items-start gap-3">
                {step.complete ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check aria-hidden="true" className="size-3.5" />
                    <span className="sr-only">Concluido</span>
                  </span>
                ) : (
                  <span className="flex size-6 shrink-0 items-center justify-center text-muted">
                    <Circle aria-hidden="true" className="size-6" />
                    <span className="sr-only">Pendente</span>
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex justify-end">
          <Button asChild>
            <Link href={progress.nextStep.href}>
              {progress.nextStep.action}
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
