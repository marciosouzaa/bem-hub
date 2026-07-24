"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { EntityDrawer } from "@/components/ui/entity-drawer";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createContactAction,
  updateContactAction,
} from "@/features/contacts/contact-actions";
import {
  contactFormSchema,
  type Contact,
  type ContactFormValues,
} from "@/features/contacts/contact-schema";
import { normalizeContactPhone } from "@/features/contacts/phone-normalization";

const formId = "contact-editor-form";

function getDefaultValues(contact: Contact | null): ContactFormValues {
  return {
    email: contact?.email ?? "",
    lifecycleStage: contact?.lifecycleStage ?? "new",
    name: contact?.name ?? "",
    phone: contact?.phone ?? "",
    tags: contact?.tags.join(", ") ?? "",
  };
}

type ContactEditorDrawerProps = {
  contact: Contact | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  open: boolean;
};

export function ContactEditorDrawer({
  contact,
  onClose,
  onSaved,
  open,
}: ContactEditorDrawerProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ContactFormValues>({
    defaultValues: getDefaultValues(contact),
    resolver: zodResolver(contactFormSchema),
  });
  const phone = useWatch({ control, name: "phone" });
  const phoneResult = normalizeContactPhone(phone);

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(contact));
  }, [contact, open, reset]);

  function closeEditor() {
    setActionError(null);
    onClose();
  }

  async function submit(values: ContactFormValues) {
    setActionError(null);
    const result = contact
      ? await updateContactAction(contact.id, values)
      : await createContactAction(values);

    if (!result.ok) {
      setActionError(result.message);
      if (result.errors) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (messages?.[0]) {
            setError(field as keyof ContactFormValues, { message: messages[0] });
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
      description={contact
        ? "Atualize identidade e classificação sem perder o histórico de atendimento."
        : "Cadastre manualmente; mensagens futuras usarão a mesma identidade telefônica."}
      formId={formId}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={closeEditor}
      open={open}
      saveLabel={contact ? "Salvar alterações" : "Cadastrar contato"}
      title={contact ? "Editar contato" : "Novo contato"}
    >
      <form className="space-y-7" id={formId} onSubmit={handleSubmit(submit)}>
        <FormSection
          description="O telefone aparece como identificação quando o nome ainda não foi informado."
          title="Identidade"
        >
          <FormField error={errors.name?.message} htmlFor="contact-name" label="Nome" optional>
            <Input
              aria-invalid={Boolean(errors.name)}
              autoFocus
              id="contact-name"
              maxLength={200}
              placeholder="Nome da pessoa ou empresa"
              {...register("name")}
            />
          </FormField>
          <FormField
            description="Sem +DDI, o número será tratado como brasileiro. Para outro país, informe + e o DDI."
            error={errors.phone?.message}
            htmlFor="contact-phone"
            label="Telefone"
            optional
          >
            <Input
              aria-invalid={Boolean(errors.phone)}
              id="contact-phone"
              inputMode="tel"
              maxLength={30}
              placeholder="+55 21 99676-3611"
              {...register("phone")}
            />
          </FormField>
          {phone && phoneResult.status === "supported" ? (
            <p className="flex items-start gap-2 rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-5 text-muted-strong">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Identidade brasileira validada. Versões com oito ou nove dígitos serão reconhecidas como o mesmo celular.
            </p>
          ) : phone && phoneResult.status === "unsupported_country" ? (
            <p className="flex items-start gap-2 rounded-[var(--radius-control)] border border-warning/25 bg-warning/5 px-3 py-2.5 text-xs leading-5 text-muted-strong">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
              DDI ainda não suportado. Contato será salvo e identificado, mas envio e deduplicação avançada podem ser limitados.
            </p>
          ) : null}
          <FormField error={errors.email?.message} htmlFor="contact-email" label="E-mail" optional>
            <Input
              aria-invalid={Boolean(errors.email)}
              id="contact-email"
              maxLength={320}
              placeholder="contato@empresa.com.br"
              type="email"
              {...register("email")}
            />
          </FormField>
        </FormSection>

        <FormSection
          description="Classifique só o necessário agora; histórico e atendimentos continuam vinculados."
          title="Relacionamento"
        >
          <FormField htmlFor="contact-stage" label="Estágio">
            <Select id="contact-stage" {...register("lifecycleStage")}>
              <option value="new">Novo contato</option>
              <option value="lead">Lead</option>
              <option value="customer">Cliente</option>
              <option value="discarded">Descartado</option>
            </Select>
          </FormField>
          <FormField
            description="Separe etiquetas por vírgula. Máximo de 12."
            error={errors.tags?.message}
            htmlFor="contact-tags"
            label="Etiquetas"
            optional
          >
            <Input
              aria-invalid={Boolean(errors.tags)}
              id="contact-tags"
              maxLength={360}
              placeholder="varejo, orçamento, recorrente"
              {...register("tags")}
            />
          </FormField>
        </FormSection>

        {actionError ? (
          <p className="rounded-[var(--radius-control)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
            {actionError}
          </p>
        ) : null}
      </form>
    </EntityDrawer>
  );
}
