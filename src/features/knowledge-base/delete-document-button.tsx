"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteDocumentButton({
  documentId,
  documentName,
}: {
  documentId: string;
  documentName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir "${documentName}"? Esta acao remove o arquivo, os chunks e o registro da base documental.`,
    );

    if (!confirmed) {
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
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Falha ao excluir documento.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <Button
        aria-label={`Excluir ${documentName}`}
        disabled={isDeleting}
        onClick={handleDelete}
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
        <p className="max-w-72 text-left text-xs leading-5 text-danger md:text-right">
          {error}
        </p>
      ) : null}
    </div>
  );
}
