import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function Spinner({ className, label = "Carregando" }: { className?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <LoaderCircle aria-hidden="true" className={cn("size-4 animate-spin", className)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
