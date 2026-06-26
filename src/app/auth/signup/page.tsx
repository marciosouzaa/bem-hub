import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth/auth-form";
import { signup } from "@/app/auth/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
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
            <CardTitle>Criar workspace</CardTitle>
            <p className="text-sm leading-6 text-muted">
              Cadastre sua empresa para comecar com assistentes oficiais e
              historico controlado.
            </p>
          </CardHeader>
          <CardContent>
            <AuthForm action={signup} mode="signup" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
