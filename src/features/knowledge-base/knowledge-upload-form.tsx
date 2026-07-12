"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { MAX_DOCUMENT_SIZE_BYTES } from "./constants";

type UploadState = {
  type: "idle" | "success" | "error";
  message: string | null;
};

export function KnowledgeUploadForm({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({
    type: "idle",
    message: null,
  });
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileRef.current?.files?.[0];

    if (!file || isUploading || !canManage) {
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setState({
        type: "error",
        message: "Arquivo acima do limite de 6 MB para ingestao sincrona.",
      });
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    setIsUploading(true);
    setState({ type: "idle", message: null });

    try {
      const response = await fetch("/api/knowledge/documents", {
        body: formData,
        method: "POST",
      });
      const body = (await response.json()) as {
        documentId?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        if (body.documentId) {
          router.refresh();
        }

        throw new Error(body.error ?? "Falha ao enviar documento.");
      }

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      setState({
        type: "success",
        message: body.message ?? "Documento enviado para processamento.",
      });
      router.refresh();
    } catch (error) {
      setState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao enviar documento.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      className="rounded-[var(--radius-panel)] border border-dashed border-primary/30 bg-panel-subtle p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-primary">
            <UploadCloud className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Enviar documento</p>
            <p className="mt-1 text-sm leading-6 text-muted-strong">
              PDF, DOCX, TXT e Markdown viram conhecimento. CSV/TSV de catalogo
              exige colunas de produto e preco e aceita ate 1.000 itens.
            </p>
          </div>
        </div>

        <input
          accept=".txt,.md,.markdown,.pdf,.docx,.csv,.tsv,text/plain,text/markdown,text/x-markdown,text/csv,text/tab-separated-values,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="min-h-11 rounded-[var(--radius-control)] border border-panel-border bg-panel px-3 py-2 text-sm text-muted-strong file:mr-3 file:rounded-md file:border-0 file:bg-sidebar-active file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canManage || isUploading}
          name="file"
          ref={fileRef}
          type="file"
        />

        {state.message ? (
          <p
            className={
              state.type === "error"
                ? "text-sm text-danger"
                : "text-sm text-primary"
            }
          >
            {state.message}
          </p>
        ) : null}

        <Button disabled={!canManage || isUploading} type="submit">
          <UploadCloud className="size-4" />
          {isUploading ? "Processando..." : "Enviar e processar"}
        </Button>
      </div>
    </form>
  );
}
