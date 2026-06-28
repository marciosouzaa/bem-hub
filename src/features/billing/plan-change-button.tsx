"use client";

import { Check, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type PlanChangeButtonProps = {
  current: boolean;
  canManage: boolean;
};

export function PlanChangeButton({
  canManage,
  current,
}: PlanChangeButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="mt-auto w-full"
      disabled={current || !canManage || pending}
      type="submit"
      variant={current ? "secondary" : "primary"}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Alterando
        </>
      ) : current ? (
        <>
          <Check className="size-4" />
          Plano atual
        </>
      ) : canManage ? (
        "Ativar plano"
      ) : (
        "Somente admin"
      )}
    </Button>
  );
}
