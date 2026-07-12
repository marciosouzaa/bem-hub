"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { IntegrationAudit } from "./audit";
import { saveIntegrationAuditAction, type AuditActionState } from "./actions";

const initialState: AuditActionState = { ok: false, message: null };
export function IntegrationAuditForm({ canManage, initial }: { canManage: boolean; initial: IntegrationAudit | null }) {
  const [state, action] = useActionState(saveIntegrationAuditAction, initialState);
  return <form action={action} className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2">
      <Field defaultValue={initial?.platform} label="Plataforma da loja" name="platform" placeholder="Nuvemshop, Shopify ou outra" />
      <label className="text-sm"><span className="text-muted-strong">Acesso por API</span><select className="mt-2 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3" defaultValue={initial?.apiAccess ?? "unknown"} name="apiAccess"><option value="unknown">Ainda nao confirmado</option><option value="yes">Disponivel</option><option value="no">Nao disponivel</option></select></label>
      <Field defaultValue={initial?.inventorySource} label="Origem do estoque" name="inventorySource" placeholder="PDV, ERP ou planilha" />
      <Field defaultValue={initial?.ordersSource} label="Origem dos pedidos" name="ordersSource" placeholder="Loja, marketplace ou planilha" />
      <Field defaultValue={initial?.customersSource} label="Origem dos clientes" name="customersSource" placeholder="CRM, loja ou planilha" />
      <Field defaultValue={initial?.notes} label="Pendencias e observacoes" name="notes" placeholder="Credenciais, responsavel, frequencia" />
    </div>
    {state.message ? <p className={state.ok ? "text-sm text-primary" : "text-sm text-danger"}>{state.message}</p> : null}
    <Submit disabled={!canManage} />
  </form>;
}
function Field({ defaultValue, label, name, placeholder }: { defaultValue?: string; label: string; name: string; placeholder: string }) { return <label className="text-sm"><span className="text-muted-strong">{label}</span><input className="mt-2 h-10 w-full rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 focus:border-primary" defaultValue={defaultValue} name={name} placeholder={placeholder} required={name !== "notes"} /></label>; }
function Submit({ disabled }: { disabled: boolean }) { const { pending } = useFormStatus(); return <Button disabled={disabled || pending} type="submit">{pending ? "Salvando..." : "Salvar auditoria"}</Button>; }
