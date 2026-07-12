"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { addMemberAction, type MemberActionState } from "./actions";

const initialState: MemberActionState = { ok: false, message: null };

export function MemberForm({ canManage }: { canManage: boolean }) {
  const [state, action] = useActionState(addMemberAction, initialState);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
      <input className="h-10 rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm focus:border-primary" disabled={!canManage} name="email" placeholder="funcionaria@empresa.com.br" required type="email" />
      <select className="h-10 rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated px-3 text-sm focus:border-primary" disabled={!canManage} name="role" defaultValue="member">
        <option value="member">Membro</option>
        <option value="admin">Admin</option>
      </select>
      <SubmitButton disabled={!canManage} />
      {state.message ? <p className={state.ok ? "text-sm text-primary md:col-span-3" : "text-sm text-danger md:col-span-3"}>{state.message}</p> : null}
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <Button disabled={disabled || pending} type="submit">{pending ? "Incluindo..." : "Incluir membro"}</Button>;
}
