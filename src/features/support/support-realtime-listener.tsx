"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getSupportRealtimeTopic,
  SUPPORT_REALTIME_EVENT,
} from "@/features/support/realtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const REFRESH_DEBOUNCE_MS = 200;

export function SupportRealtimeListener({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;

    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      // Realtime melhora a atualizacao da inbox, mas nao pode impedir o acesso
      // ao atendimento quando a configuracao publica estiver indisponivel.
      return;
    }

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const scheduleRefresh = () => {
      if (!active) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };

    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!active) return;

        channel = supabase
          .channel(getSupportRealtimeTopic(organizationId), {
            config: { private: true },
          })
          .on("broadcast", { event: SUPPORT_REALTIME_EVENT }, scheduleRefresh)
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              // Fecha a janela entre o render do servidor e a assinatura, e
              // reconcilia novamente depois de qualquer reconexao.
              scheduleRefresh();
            }
          });
      })
      .catch(() => {
        // Sem sessao Realtime valida, foco/visibilidade ainda reconciliam a
        // fonte canonica. A proxima montagem tenta autenticar novamente.
        scheduleRefresh();
      });

    return () => {
      active = false;
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [organizationId, router]);

  return null;
}
