"use client";

import Link from "next/link";

import { Checkbox } from "@/components/ui/checkbox";
import type { Tag } from "@/features/tags/tag-schema";

type ContactTagSelectorProps = {
  availableTags: Tag[];
  disabled?: boolean;
  onChange: (tagIds: string[]) => void;
  value: string[];
};

export function ContactTagSelector({
  availableTags,
  disabled = false,
  onChange,
  value,
}: ContactTagSelectorProps) {
  if (availableTags.length === 0) {
    return (
      <div className="rounded-[var(--radius-control)] border border-dashed border-panel-border bg-panel-subtle px-4 py-3 text-sm text-muted">
        Nenhuma etiqueta cadastrada.{" "}
        <Link
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          href="/app/tags"
        >
          Criar etiqueta
        </Link>
      </div>
    );
  }

  return (
    <div
      aria-label="Etiquetas do contato"
      className="max-h-52 space-y-1 overflow-y-auto rounded-[var(--radius-control)] border border-panel-border bg-panel-subtle p-2"
      role="group"
    >
      {availableTags.map((tag) => {
        const checked = value.includes(tag.id);
        return (
          <label
            className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition hover:bg-panel-elevated"
            key={tag.id}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onChange={() => {
                onChange(checked
                  ? value.filter((tagId) => tagId !== tag.id)
                  : [...value, tag.id]);
              }}
            />
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: tag.hexColor }}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {tag.name}
            </span>
          </label>
        );
      })}
    </div>
  );
}
