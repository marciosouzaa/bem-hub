"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";

export function DeleteDocumentButton({
  documentId,
  documentName,
}: {
  documentId: string;
  documentName: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteDocument() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/knowledge/documents/${documentId}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Falha ao excluir documento.");
      }

      router.refresh();
    } catch (deleteError) {
      throw deleteError instanceof Error
        ? deleteError
        : new Error("Falha ao excluir documento.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <Button
        aria-label={`Excluir ${documentName}`}
        disabled={isDeleting}
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        size="sm"
        type="button"
        variant="danger"
      >
        {isDeleting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        Excluir
      </Button>
      {error ? (
        <FeedbackMessage className="max-w-72 text-left text-xs md:text-right" variant="error">
          {error}
        </FeedbackMessage>
      ) : null}
      <ConfirmDialog
        confirmLabel="Excluir documento"
        description={`Excluir "${documentName}"? Esta ação remove arquivo, chunks e registro da base documental.`}
        onConfirm={deleteDocument}
        onError={(deleteError) => {
          setError(
            deleteError instanceof Error
              ? deleteError.message
              : "Falha ao excluir documento.",
          );
        }}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title="Excluir este documento?"
        variant="danger"
      />
    </div>
  );
}
