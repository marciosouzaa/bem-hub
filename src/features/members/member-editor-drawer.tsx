"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  inviteMemberAction,
  updateMemberRoleAction,
} from "@/features/members/actions";
import {
  memberInviteSchema,
  type MemberInviteValues,
  type MemberRoleFormValues,
} from "@/features/members/member-schema";
import type { OrganizationMemberItem } from "@/features/members/queries";

const formId = "member-editor-form";

type MemberEditorDrawerProps = {
  member: OrganizationMemberItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  open: boolean;
};

type MemberEditorValues = MemberInviteValues & MemberRoleFormValues;

function getDefaultValues(member: OrganizationMemberItem | null): MemberEditorValues {
  return {
    email: member?.email ?? "",
    name: member?.name ?? "",
    role: member?.role === "admin" ? "admin" : "member",
  };
}

export function MemberEditorDrawer({
  member,
  onClose,
  onSaved,
  open,
}: MemberEditorDrawerProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<MemberEditorValues>({
    defaultValues: getDefaultValues(member),
    resolver: zodResolver(memberInviteSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(member));
  }, [member, open, reset]);

  function closeEditor() {
    setActionError(null);
    onClose();
  }

  async function submit(values: MemberEditorValues) {
    setActionError(null);
    const result = member
      ? await updateMemberRoleAction(member.userId, { role: values.role })
      : await inviteMemberAction(values);

    if (!result.ok) {
      setActionError(result.message);
      if (result.errors) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (messages?.[0]) {
            setError(field as keyof MemberEditorValues, {
              message: messages[0],
            });
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
      description={member
        ? "Ajuste o papel operacional deste usuario no workspace."
        : "Envie um convite por e-mail. O acesso so fica ativo apos confirmacao."}
      formId={formId}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={closeEditor}
      open={open}
      saveLabel={member ? "Salvar acesso" : "Convidar membro"}
      submittingLabel={member ? "Salvando..." : "Enviando..."}
      title={member ? "Editar membro" : "Novo membro"}
    >
      <form className="space-y-7" id={formId} onSubmit={handleSubmit(submit)}>
        <FormSection
          description={member
            ? "O e-mail identifica a conta vinculada. Owner nao pode ser editado."
            : "O convite usa sempre a rota publica de producao configurada para confirmacao."}
          title="Identidade"
        >
          <FormField
            error={errors.email?.message}
            htmlFor="member-email"
            label="E-mail"
          >
            <Input
              aria-invalid={Boolean(errors.email)}
              autoFocus={!member}
              disabled={Boolean(member)}
              id="member-email"
              placeholder="pessoa@empresa.com.br"
              type="email"
              {...register("email")}
            />
          </FormField>
          {!member ? (
            <FormField
              error={errors.name?.message}
              htmlFor="member-name"
              label="Nome"
              optional
            >
              <Input
                aria-invalid={Boolean(errors.name)}
                id="member-name"
                maxLength={80}
                placeholder="Nome da pessoa"
                {...register("name")}
              />
            </FormField>
          ) : null}
        </FormSection>

        <FormSection title="Permissao">
          <FormField error={errors.role?.message} htmlFor="member-role" label="Papel">
            <Select
              aria-invalid={Boolean(errors.role)}
              id="member-role"
              {...register("role")}
            >
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </Select>
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
