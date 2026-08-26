import Link from "next/link";

import { InvitationSessionBridge } from "@/app/auth/invitation-session-bridge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitePage() {
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
            <CardTitle>Confirmando convite</CardTitle>
            <p className="text-sm leading-6 text-muted">
              Estamos preparando seu primeiro acesso ao workspace.
            </p>
          </CardHeader>
          <CardContent>
            <InvitationSessionBridge />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
