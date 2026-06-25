import {
  Bot,
  CheckCircle2,
  FileText,
  Gauge,
  MessageSquareText,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const metrics = [
  ["Mensagens", "1.284", "72% usadas"],
  ["Documentos", "48", "RAG pronto"],
  ["Templates", "12", "execucao manual"],
];

const previewNavItems = [
  { icon: MessageSquareText, label: "Chat" },
  { icon: Bot, label: "Assistentes" },
  { icon: FileText, label: "Conhecimento" },
  { icon: Workflow, label: "Automacoes" },
  { icon: Gauge, label: "Uso" },
];

export function AppPreview() {
  return (
    <div className="rounded-lg border border-panel-border bg-background p-3 shadow-sm">
      <div className="rounded-md border border-panel-border bg-panel">
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-warning" />
            <span className="size-3 rounded-full bg-success" />
            <span className="size-3 rounded-full bg-accent" />
          </div>
          <span className="text-xs text-muted">workspace.bemhub.app</span>
        </div>
        <div className="grid min-h-[460px] md:grid-cols-[180px_1fr]">
          <aside className="hidden border-r border-panel-border p-4 md:block">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              BEM HUB
            </div>
            <div className="space-y-2 text-xs text-muted">
              {previewNavItems.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-md px-2 py-2"
                >
                  <Icon className="size-4" />
                  {label}
                </div>
              ))}
            </div>
          </aside>
          <div className="p-4">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs text-muted">Contabilidade Modelo</p>
                <h3 className="text-lg font-semibold">
                  Assistente Atendimento
                </h3>
              </div>
              <span className="w-fit rounded-md border border-panel-border px-2 py-1 text-xs text-muted">
                owner
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map(([label, value, caption]) => (
                <div
                  key={label}
                  className="rounded-md border border-panel-border p-3"
                >
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-muted">{caption}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.78fr]">
              <div className="rounded-md border border-panel-border p-3">
                <p className="text-sm font-medium">Pergunta recente</p>
                <div className="mt-3 rounded-md bg-background p-3 text-xs leading-5 text-muted">
                  Resuma os pontos principais do contrato anexado e gere uma
                  resposta simples para o cliente.
                </div>
                <div className="mt-3 rounded-md bg-primary p-3 text-xs leading-5 text-primary-foreground">
                  Encontrei clausulas de prazo, multa e renovacao. A resposta
                  sugerida foi gerada com base no documento enviado.
                </div>
              </div>
              <div className="rounded-md border border-panel-border p-3">
                <p className="text-sm font-medium">Fontes usadas</p>
                <div className="mt-3 space-y-2 text-xs text-muted">
                  {[
                    "Contrato_servicos.pdf",
                    "Politica_atendimento.md",
                    "Checklist_onboarding.docx",
                  ].map((source) => (
                    <div key={source} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" />
                      <span>{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
