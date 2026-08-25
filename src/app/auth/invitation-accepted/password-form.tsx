"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateInvitationPasswordAction,
  type PasswordActionState,
} from "@/app/auth/invitation-accepted/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: PasswordActionState = { ok: false, message: null };

export function InvitationPasswordForm() {
  const [state, action] = useActionState(
    updateInvitationPasswordAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="invite-password">
        Senha de acesso
      </label>
      <Input
        autoComplete="new-password"
        id="invite-password"
        minLength={8}
        name="password"
        placeholder="Minimo de 8 caracteres"
        type="password"
      />
      {state.fieldErrors?.password?.[0] ? (
        <p className="text-xs text-warning">{state.fieldErrors.password[0]}</p>
      ) : state.message ? (
        <p className={state.ok ? "text-sm text-primary" : "text-sm text-danger"}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant="secondary">
      {pending ? "Salvando..." : "Definir senha"}
    </Button>
  );
}
