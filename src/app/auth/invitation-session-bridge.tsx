"use client";

import { useEffect, useState } from "react";

import { getInvitationSessionTransition } from "@/features/members/invitation-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const invitationAcceptancePath = "/app/invitations/accept";

export function InvitationSessionBridge() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const transition = getInvitationSessionTransition({
      hash: window.location.hash,
      search: window.location.search,
    });

    if (transition.kind === "none") return;

    if (transition.kind === "code") {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("code", transition.code);
      callback.searchParams.set("next", invitationAcceptancePath);
      window.location.replace(`${callback.pathname}${callback.search}`);
      return;
    }

    const session = transition;

    let cancelled = false;

    async function persistInviteSession() {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });

      if (cancelled) return;
      if (error) {
        setHasError(true);
        return;
      }

      window.location.replace(invitationAcceptancePath);
    }

    void persistInviteSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hasError) return null;

  return (
    <p className="mb-4 text-sm text-danger">
      Este link de convite expirou ou nao pode mais ser usado.
    </p>
  );
}
