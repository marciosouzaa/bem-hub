import Link from "next/link";

import { InvitationPasswordForm } from "@/app/auth/invitation-accepted/password-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InvitationAcceptedPageProps = {
  searchParams?: Promise<{ first_access?: string; status?: string }>;
};

export default async function InvitationAcceptedPage({
  searchParams,
}: InvitationAcceptedPageProps) {
  const params = await searchParams;
  const accepted = params?.status === "accepted";
  const firstAccess = params?.first_access === "1";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            BH
          </span>
          <span className="text-lg font-semibold">BEM HUB</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>
              {accepted
                ? firstAccess ? "Primeiro acesso" : "Convite confirmado"
                : "Convite nao confirmado"}
            </CardTitle>
            <p className="text-sm leading-6 text-muted">
              {accepted
                ? firstAccess
                  ? "Defina sua senha para concluir o acesso ao workspace convidado."
                  : "Seu acesso a equipe foi ativado. Defina uma senha se este for seu primeiro acesso."
                : "Este convite expirou, foi removido ou ja nao esta disponivel."}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {accepted ? <InvitationPasswordForm redirectAfterSave={firstAccess} /> : null}
            {!firstAccess ? (
              <Button asChild className="w-full">
                <Link href={accepted ? "/app" : "/auth/login"}>
                  {accepted ? "Entrar no workspace" : "Voltar para login"}
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
