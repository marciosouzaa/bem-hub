import {
  Bot,
  Building2,
  FileText,
  Gauge,
  History,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const assistants = [
  ["Atendimento", "Respostas com base em politicas e historico"],
  ["Comercial", "Propostas, follow-ups e qualificacao"],
  ["Operacoes", "Checklists, relatorios e procedimentos"],
];

const conversations = [
  "Resumo do contrato da Clinica Azul",
  "Resposta para lead de imobiliaria",
  "Checklist de fechamento mensal",
];

const navItems = [
  { icon: MessageSquareText, label: "Chat" },
  { icon: Bot, label: "Assistentes" },
  { icon: FileText, label: "Documentos" },
  { icon: Workflow, label: "Automacoes" },
  { icon: Gauge, label: "Uso" },
  { icon: Users, label: "Membros" },
  { icon: Settings, label: "Configuracoes" },
];

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-panel-border bg-panel px-4 py-5">
          <div className="flex items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              BH
            </span>
            <div>
              <p className="font-semibold">BEM HUB</p>
              <p className="text-xs text-muted">Workspace demo</p>
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            {navItems.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted transition hover:bg-background hover:text-foreground"
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-5 md:px-8">
          <header className="flex flex-col gap-4 border-b border-panel-border pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <Building2 className="size-4" />
                Contabilidade Modelo Ltda
              </div>
              <h1 className="mt-2 text-2xl font-semibold">Chat corporativo</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary">
                <Search className="size-4" />
                Buscar
              </Button>
              <Button>
                <Plus className="size-4" />
                Nova conversa
              </Button>
            </div>
          </header>

          <div className="grid gap-5 py-5 xl:grid-cols-[1fr_340px]">
            <Card className="min-h-[620px]">
              <CardHeader className="border-b border-panel-border">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Badge>Assistente Atendimento</Badge>
                    <CardTitle className="mt-3">
                      Pergunte sobre documentos, processos e clientes
                    </CardTitle>
                  </div>
                  <Button variant="secondary">
                    <History className="size-4" />
                    Historico
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-[510px] flex-col justify-between p-0">
                <div className="space-y-4 p-5">
                  <div className="max-w-[78%] rounded-md border border-panel-border bg-background p-4 text-sm leading-6">
                    Quais documentos preciso solicitar para abrir uma empresa
                    de prestacao de servicos?
                  </div>
                  <div className="ml-auto max-w-[82%] rounded-md bg-primary p-4 text-sm leading-6 text-primary-foreground">
                    Solicite contrato social, documentos dos socios,
                    comprovante de endereco, atividade economica pretendida e
                    dados fiscais iniciais. Encontrei esses itens no checklist
                    interno de abertura.
                  </div>
                </div>
                <div className="border-t border-panel-border p-4">
                  <div className="flex items-center gap-3 rounded-md border border-panel-border bg-panel p-2">
                    <input
                      className="h-10 flex-1 bg-transparent px-2 text-sm outline-none"
                      placeholder="Digite uma pergunta para o assistente"
                    />
                    <Button>
                      <Sparkles className="size-4" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Assistentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assistants.map(([name, description]) => (
                    <div
                      key={name}
                      className="rounded-md border border-panel-border p-3"
                    >
                      <p className="text-sm font-medium">{name}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversas recentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation}
                      className="w-full rounded-md border border-panel-border px-3 py-2 text-left text-sm text-muted hover:text-foreground"
                    >
                      {conversation}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
