"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  Clock3,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeedbackToast } from "@/components/ui/feedback-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { manageSupportConversationAction } from "@/features/support/support-actions";
import type { SupportConversation } from "@/features/support/queries";
import type {
  SupportOperationInput,
} from "@/features/support/support-operation-schema";
import {
  supportPriorityLabels,
} from "@/features/support/support-presenters";

type SupportConversationActionsProps = {
  conversation: SupportConversation;
  viewerCanAdmin: boolean;
  viewerId: string;
};

export function SupportConversationActions({
  conversation,
  viewerCanAdmin,
  viewerId,
}: SupportConversationActionsProps) {
  const router = useRouter();
  const { showToast } = useFeedbackToast();
  const [pending, setPending] = useState(false);
  const assignedToViewer = conversation.assignedTo === viewerId;
  const canManage = viewerCanAdmin || assignedToViewer;
  const canReopen = conversation.assignedTo === null
    || assignedToViewer
    || viewerCanAdmin;

  async function runOperation(
    operation: SupportOperationInput["operation"],
    priority: SupportOperationInput["priority"] = null,
  ) {
    if (pending) return;
    setPending(true);
    try {
      const result = await manageSupportConversationAction({
        conversationId: conversation.id,
        expectedVersion: conversation.version,
        operation,
        priority,
        userId: null,
      });
      showToast({
        message: result.message,
        variant: result.ok ? "success" : "error",
      });
      router.refresh();
    } catch {
      showToast({
        message: "Nao foi possivel atualizar o atendimento.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  function refreshMessages() {
    router.refresh();
    showToast({
      message: "Mensagens atualizadas.",
      variant: "info",
    });
  }

  const assigneeLabel = assignedToViewer
    ? "Com você"
    : conversation.assignee?.name?.trim()
      || conversation.assignee?.email
      || (conversation.assignedTo ? "Com outro membro" : "Sem responsável");

  return (
    <>
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex items-center gap-2">
        <Badge className="hidden normal-case tracking-normal md:inline-flex">
          <UserCheck className="mr-1 size-3" />
          {assigneeLabel}
        </Badge>

        {conversation.status === "resolved" ? (
          canReopen ? (
            <Button
              disabled={pending}
              onClick={() => runOperation("reopen")}
              size="sm"
              variant="secondary"
            >
              {pending
                ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                : <RotateCcw className="size-3.5" />}
              Reabrir
            </Button>
          ) : null
        ) : conversation.assignedTo === null ? (
          <Button
            disabled={pending}
            onClick={() => runOperation("take")}
            size="sm"
          >
            {pending
              ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
              : <UserCheck className="size-3.5" />}
            Assumir
          </Button>
        ) : null}

        {conversation.status !== "resolved" && canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Ações do atendimento"
                disabled={pending}
                size="icon"
                variant="secondary"
              >
                {pending
                  ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                  : <MoreHorizontal className="size-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={refreshMessages}>
                <RefreshCw className="size-4" />
                Atualizar mensagens
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {conversation.status !== "open" ? (
                <DropdownMenuItem onSelect={() => runOperation("open")}>
                  <RotateCcw className="size-4" />
                  Marcar como aberto
                </DropdownMenuItem>
              ) : null}
              {conversation.status !== "pending" ? (
                <DropdownMenuItem onSelect={() => runOperation("pending")}>
                  <Clock3 className="size-4" />
                  Marcar como pendente
                </DropdownMenuItem>
              ) : null}
              {conversation.status !== "escalated" ? (
                <DropdownMenuItem onSelect={() => runOperation("escalate")}>
                  <AlertTriangle className="size-4" />
                  Escalar atendimento
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => runOperation("resolve")}>
                <CheckCircle2 className="size-4" />
                Resolver atendimento
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CircleGauge className="mr-2 size-4" />
                  Definir prioridade
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {(["low", "normal", "high", "urgent"] as const).map(
                    (priority) => (
                      <DropdownMenuItem
                        disabled={conversation.priority === priority}
                        key={priority}
                        onSelect={() => runOperation("set_priority", priority)}
                      >
                        {supportPriorityLabels[priority]}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {conversation.assignedTo !== null ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => runOperation("release")}>
                    <UserMinus className="size-4" />
                    Devolver para fila
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
    </>
  );
}
