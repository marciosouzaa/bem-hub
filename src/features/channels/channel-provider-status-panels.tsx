"use client";

import Image from "next/image";

import type { ChannelPairing } from "@/features/channels/providers/channel-provider-adapter";
import type { ChannelConnection } from "@/features/channels/channel-schema";

export function ChannelConnectionState({
  channel,
}: {
  channel: ChannelConnection;
}) {
  const labels: Partial<Record<ChannelConnection["status"], string>> = {
    awaiting_pairing: "Aguardando pareamento",
    connected: "Conectado",
    connecting: "Conectando",
    draft: "Não configurado",
    failed: "Com falha",
  };
  return (
    <div className="rounded-[var(--radius-panel)] border border-panel-border bg-panel-subtle p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            Estado operacional
          </p>
          <p className="mt-1 font-medium text-foreground">
            {labels[channel.status] ?? "Desconectado"}
          </p>
        </div>
        <span
          className={`size-2.5 rounded-full ${
            channel.status === "connected"
              ? "bg-success"
              : channel.status === "failed"
                ? "bg-danger"
                : "bg-warning"
          }`}
        />
      </div>
      {channel.statusReason ? (
        <p className="mt-3 text-sm text-muted">{channel.statusReason}</p>
      ) : null}
    </div>
  );
}

export function ChannelPairingPanel({
  pairing,
}: {
  pairing: ChannelPairing;
}) {
  if (pairing.kind === "none") {
    return (
      <p className="text-sm text-muted">
        Nenhum pareamento necessário neste momento.
      </p>
    );
  }
  if (pairing.kind === "code") {
    return (
      <div className="rounded-[var(--radius-panel)] border border-primary/25 bg-primary/5 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
          Código de pareamento
        </p>
        <p className="mt-3 font-mono text-2xl font-semibold tracking-[0.18em] text-foreground">
          {pairing.value}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-panel)] border border-primary/25 bg-white p-4">
      <Image
        alt="QR Code para conectar o WhatsApp"
        className="mx-auto size-64"
        height={256}
        src={pairing.value}
        unoptimized
        width={256}
      />
    </div>
  );
}
