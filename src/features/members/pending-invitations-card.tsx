"use client";

import { Check, MailOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useFeedbackToast } from "@/components/ui/feedback-toast";
import { acceptPendingInvitationAction } from "@/features/members/actions";
import type { PendingOrganizationInvitation } from "@/features/members/pending-invitations";

type PendingInvitationsCardProps = {
  invitations: PendingOrganizationInvitation[];
};

export function PendingInvitationsCard({
  invitations,
}: PendingInvitationsCardProps) {
  const router = useRouter();
  const { showToast } = useFeedbackToast();
  const [isPending, startTransition] = useTransition();

  if (invitations.length === 0) return null;

  function acceptInvitation() {
    startTransition(async () => {
      const result = await acceptPendingInvitationAction();
      showToast({
        message: result.message,
        variant: result.ok ? "success" : "error",
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <Card className="border-primary/30 bg-sidebar-active/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailOpen aria-hidden="true" className="size-4 text-primary" />
          Convites pendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <div
            className="flex flex-col gap-3 border-b border-panel-border pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            key={invitation.organizationId}
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{invitation.organizationName}</p>
              <p className="mt-1 truncate text-sm text-muted-strong">
                {invitation.organizationSlug}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge className="border-panel-border bg-panel-elevated text-muted-strong">
                {getRoleLabel(invitation.role)}
              </Badge>
              <Button disabled={isPending} onClick={acceptInvitation} size="sm">
                {isPending ? <Spinner /> : <Check aria-hidden="true" className="size-4" />}
                Aceitar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getRoleLabel(role: PendingOrganizationInvitation["role"]) {
  if (role === "admin") return "Admin";
  return "Membro";
}
