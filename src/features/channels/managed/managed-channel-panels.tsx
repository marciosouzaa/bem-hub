import { QrCode, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";

export function ManagedChannelOperations({
  connected,
  hasPreparedInstance,
  onRefresh,
  onRequestPairing,
  operating,
}: {
  connected: boolean;
  hasPreparedInstance: boolean;
  onRefresh: () => void;
  onRequestPairing: () => void;
  operating: boolean;
}) {
  if (!hasPreparedInstance) return null;

  return (
    <FormSection
      description="A conexão é verificada automaticamente enquanto este painel estiver aberto."
      title="Operação"
    >
      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <Button
            disabled={operating}
            onClick={onRequestPairing}
            type="button"
            variant="secondary"
          >
            <QrCode aria-hidden="true" className="size-4" />
            Gerar novo QR Code
          </Button>
        ) : null}
        <Button
          disabled={operating}
          onClick={onRefresh}
          type="button"
          variant="ghost"
        >
          Atualizar estado
        </Button>
      </div>
    </FormSection>
  );
}

export function ManagedChannelSecurityNote() {
  return (
    <div className="rounded-[var(--radius-panel)] border border-panel-border bg-panel-subtle p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-primary"
        />
        <p className="text-sm leading-6 text-muted">
          Tokens, URL do servidor e credenciais da instância não são
          solicitados nem exibidos. Eles ficam protegidos no backend.
        </p>
      </div>
    </div>
  );
}
