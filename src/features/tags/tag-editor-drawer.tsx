"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createTagAction,
  updateTagAction,
} from "@/features/tags/tag-actions";
import {
  tagFormSchema,
  type Tag,
  type TagFormValues,
} from "@/features/tags/tag-schema";

const formId = "tag-editor-form";

function getDefaultValues(tag: Tag | null): TagFormValues {
  return {
    description: tag?.description ?? "",
    hexColor: tag?.hexColor ?? "#4EE3A3",
    name: tag?.name ?? "",
  };
}

type TagEditorDrawerProps = {
  onClose: () => void;
  onSaved: (message: string) => void;
  open: boolean;
  tag: Tag | null;
};

export function TagEditorDrawer({
  onClose,
  onSaved,
  open,
  tag,
}: TagEditorDrawerProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<TagFormValues>({
    defaultValues: getDefaultValues(tag),
    resolver: zodResolver(tagFormSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(tag));
  }, [open, reset, tag]);

  function closeEditor() {
    setActionError(null);
    onClose();
  }

  async function submit(values: TagFormValues) {
    setActionError(null);
    const result = tag
      ? await updateTagAction(tag.id, values)
      : await createTagAction(values);

    if (!result.ok) {
      setActionError(result.message);
      if (result.errors) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (messages?.[0]) {
            setError(field as keyof TagFormValues, { message: messages[0] });
          }
        }
      }
      return;
    }

    reset(values);
    closeEditor();
    onSaved(result.message);
  }

  return (
    <EntityDrawer
      description="Padronize classificações usadas nos contatos e mantenha a mesma linguagem em toda a operação."
      formId={formId}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={closeEditor}
      open={open}
      saveLabel={tag ? "Salvar alterações" : "Criar etiqueta"}
      title={tag ? "Editar etiqueta" : "Nova etiqueta"}
    >
      <form className="space-y-7" id={formId} onSubmit={handleSubmit(submit)}>
        <FormSection
          description="O nome identifica a classificação; a cor facilita a leitura nas listas."
          title="Identidade"
        >
          <FormField
            error={errors.name?.message}
            htmlFor="tag-name"
            label="Nome"
          >
            <Input
              aria-invalid={Boolean(errors.name)}
              autoFocus
              id="tag-name"
              maxLength={60}
              placeholder="Ex.: Cliente recorrente"
              {...register("name")}
            />
          </FormField>
          <FormField
            description="Use seis dígitos hexadecimais."
            error={errors.hexColor?.message}
            htmlFor="tag-color"
            label="Cor"
          >
            <Controller
              control={control}
              name="hexColor"
              render={({ field }) => (
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Selecionar cor da etiqueta"
                    className="size-10 shrink-0 cursor-pointer rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(field.value)
                      ? field.value
                      : "#4EE3A3"}
                  />
                  <Input
                    aria-invalid={Boolean(errors.hexColor)}
                    id="tag-color"
                    maxLength={7}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    placeholder="#4EE3A3"
                    value={field.value}
                  />
                </div>
              )}
            />
          </FormField>
        </FormSection>

        <FormSection title="Contexto">
          <FormField
            error={errors.description?.message}
            htmlFor="tag-description"
            label="Descrição"
            optional
          >
            <Textarea
              aria-invalid={Boolean(errors.description)}
              id="tag-description"
              maxLength={500}
              placeholder="Quando a equipe deve aplicar esta etiqueta?"
              rows={5}
              {...register("description")}
            />
          </FormField>
        </FormSection>

        {actionError ? (
          <p
            className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
      </form>
    </EntityDrawer>
  );
}
