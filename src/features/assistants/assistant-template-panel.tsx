"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  buildCatalogAssistantTemplate,
  CATALOG_TONES,
  type CatalogTone,
} from "@/features/assistants/catalog-template";

type CatalogTemplate = ReturnType<typeof buildCatalogAssistantTemplate>;

export function AssistantTemplatePanel({ onApply }: { onApply: (template: CatalogTemplate) => void }) {
  const [brandName, setBrandName] = useState("");
  const [tone, setTone] = useState<CatalogTone>("acolhedor");

  return (
    <div className="rounded-[var(--radius-control)] border border-primary/20 bg-sidebar-active/35 p-4">
      <div className="flex items-start gap-3">
        <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">Começar por um modelo de catálogo</p>
          <p className="mt-1 text-xs leading-5 text-muted-strong">
            Gere uma base segura e revise as instruções antes de salvar.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField htmlFor="assistant-brand-name" label="Marca" optional>
          <Input
            id="assistant-brand-name"
            maxLength={80}
            onChange={(event) => setBrandName(event.target.value)}
            placeholder="Nome da empresa"
            value={brandName}
          />
        </FormField>
        <FormField htmlFor="assistant-catalog-tone" label="Tom de voz">
          <Select id="assistant-catalog-tone" onChange={(event) => setTone(event.target.value as CatalogTone)} value={tone}>
            {CATALOG_TONES.map((catalogTone) => (
              <option key={catalogTone.value} value={catalogTone.value}>{catalogTone.label}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <Button className="mt-3" onClick={() => onApply(buildCatalogAssistantTemplate({ brandName, tone }))} size="sm" type="button" variant="secondary">
        Aplicar modelo
      </Button>
    </div>
  );
}
