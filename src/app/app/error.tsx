"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import { PageLayout } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkspaceError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Falha no workspace", error);
  }, [error]);

  return (
    <PageLayout className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <Card className="w-full max-w-xl border-danger/35">
        <CardContent className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-danger/10 text-danger">
            <AlertTriangle className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">
            Nao foi possivel carregar esta area
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-strong">
            O workspace preservou sua sessao. Tente novamente; se a falha
            continuar, consulte os logs do servidor com o identificador abaixo.
          </p>
          {error.digest ? (
            <code className="mt-3 rounded-md bg-panel-elevated px-2 py-1 text-xs text-muted">
              {error.digest}
            </code>
          ) : null}
          <Button className="mt-6" onClick={unstable_retry} type="button">
            <RefreshCcw className="size-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
