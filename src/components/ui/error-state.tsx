import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  description?: string;
  onRetry?: () => void;
  title?: string;
};

export function ErrorState({
  description = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  title = "Algo saiu do esperado",
}: ErrorStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center" role="alert">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger">
        <CircleAlert aria-hidden="true" className="size-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {onRetry ? (
        <Button className="mt-5" onClick={onRetry} size="sm" variant="secondary">
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
