import { PageLayout } from "@/components/app";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkspaceLoading() {
  return (
    <PageLayout>
      <div aria-busy="true" aria-label="Carregando workspace" className="space-y-6">
        <div className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded bg-panel-elevated motion-reduce:animate-none" />
          <div className="h-10 w-72 max-w-full animate-pulse rounded bg-panel-elevated motion-reduce:animate-none" />
          <div className="h-4 w-[34rem] max-w-full animate-pulse rounded bg-panel-elevated motion-reduce:animate-none" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <CardContent className="space-y-4 p-5 md:p-6">
                <div className="size-9 animate-pulse rounded-[var(--radius-control)] bg-panel-elevated motion-reduce:animate-none" />
                <div className="h-6 w-20 animate-pulse rounded bg-panel-elevated motion-reduce:animate-none" />
                <div className="h-3 w-full animate-pulse rounded bg-panel-elevated motion-reduce:animate-none" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-4 p-5 md:p-6">
            {[0, 1, 2, 3].map((item) => (
              <div
                className="h-14 animate-pulse rounded bg-panel-elevated motion-reduce:animate-none"
                key={item}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
