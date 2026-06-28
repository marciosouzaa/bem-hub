import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function UpgradeCTA({
  title,
  description,
  planName,
  feature,
}: {
  title: string;
  description: string;
  planName: string;
  feature?: string;
}) {
  const href = feature
    ? `/app/settings/billing?feature=${encodeURIComponent(feature)}`
    : "/app/settings/billing";

  return (
    <Card className="border-warning/50 bg-panel-elevated">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-panel text-warning">
            <Lock className="size-5" />
          </span>
          <div>
            <Badge>Plano {planName}</Badge>
            <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-strong">
              {description}
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={href}>
            Ver opções
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
