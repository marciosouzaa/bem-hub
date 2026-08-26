import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth/auth-form";
import { InvitationSessionBridge } from "@/app/auth/invitation-session-bridge";
import { login } from "@/app/auth/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeInternalPath } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = sanitizeInternalPath(params?.next);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next);
  }

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
            <CardTitle>Entrar no workspace</CardTitle>
            <p className="text-sm leading-6 text-muted">
              Acesse os assistentes, documentos e automacoes da sua empresa.
            </p>
          </CardHeader>
          <CardContent>
            <InvitationSessionBridge />
            <AuthForm action={login} mode="login" next={next} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
