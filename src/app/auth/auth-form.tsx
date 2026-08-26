"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

type AuthFormProps = {
  mode: "login" | "signup";
  next?: string;
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
};

const initialState: AuthActionState = {};

export function AuthForm({ mode, action, next }: AuthFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input name="next" type="hidden" value={next} /> : null}
      {isSignup ? (
        <>
          <Field
            autoComplete="name"
            error={state.fieldErrors?.name?.[0]}
            label="Nome"
            name="name"
            placeholder="Seu nome"
          />
          <Field
            autoComplete="organization"
            error={state.fieldErrors?.organizationName?.[0]}
            label="Empresa"
            name="organizationName"
            placeholder="Nome da empresa"
          />
        </>
      ) : null}

      <Field
        autoComplete="email"
        error={state.fieldErrors?.email?.[0]}
        label="E-mail"
        name="email"
        placeholder="voce@empresa.com.br"
        type="email"
      />
      <Field
        autoComplete={isSignup ? "new-password" : "current-password"}
        error={state.fieldErrors?.password?.[0]}
        label="Senha"
        name="password"
        placeholder={isSignup ? "Minimo de 8 caracteres" : "Sua senha"}
        type="password"
      />

      {state.message ? (
        <p className="rounded-md border border-panel-border bg-background px-3 py-2 text-sm leading-5 text-muted">
          {state.message}
        </p>
      ) : null}

      <SubmitButton>{isSignup ? "Criar workspace" : "Entrar"}</SubmitButton>

      <p className="text-center text-sm text-muted">
        {isSignup ? "Ja tem uma conta?" : "Ainda nao tem conta?"}{" "}
        <Link
          className="font-medium text-primary hover:underline"
          href={isSignup ? "/auth/login" : "/auth/signup"}
        >
          {isSignup ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}

type FieldProps = {
  autoComplete: string;
  error?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
};

function Field({
  autoComplete,
  error,
  label,
  name,
  placeholder,
  type = "text",
}: FieldProps) {
  return (
    <label className="block text-sm font-medium">
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        className="mt-2 h-11 w-full rounded-md border border-panel-border bg-panel px-3 text-sm outline-none transition focus:border-primary"
        name={name}
        placeholder={placeholder}
        type={type}
      />
      {error ? <span className="mt-1 block text-xs text-warning">{error}</span> : null}
    </label>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Processando..." : children}
    </Button>
  );
}
