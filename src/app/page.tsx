import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { AppPreview } from "@/components/marketing/app-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const problems = [
  "IA usada sem governanca",
  "Conhecimento espalhado",
  "Rotinas repetitivas manuais",
  "Historico e auditoria ausentes",
];

const mvpBlocks = [
  {
    title: "Assistentes por area",
    description:
      "Configure instrucoes, modelo e acesso para atendimento, comercial, financeiro ou operacoes.",
    icon: Bot,
  },
  {
    title: "Base de conhecimento",
    description:
      "Suba documentos e use busca semantica para respostas com contexto da empresa.",
    icon: FileText,
  },
  {
    title: "Automacoes manuais",
    description:
      "Execute templates de resumo, resposta ao cliente, checklist e relatorio sem codigo.",
    icon: Workflow,
  },
  {
    title: "Controle multiempresa",
    description:
      "Organizacoes, papeis, limites de uso e RLS desde o primeiro desenho tecnico.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-panel-border bg-panel">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
              BH
            </span>
            <span>BEM HUB</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <Link href="#mvp">MVP</Link>
            <Link href="#roadmap">Roadmap</Link>
            <Link href="/app">Workspace</Link>
          </nav>
          <Button asChild size="sm">
            <Link href="/app">
              Abrir demo <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="bg-panel">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
          <div className="flex flex-col justify-center">
            <Badge className="mb-5 w-fit">IA operacional para PMEs</Badge>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-normal text-foreground md:text-6xl">
              BEM HUB
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
              Coloque a IA para trabalhar nos processos da sua empresa, com
              assistentes, documentos, automacoes e controle em um unico
              workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/app">
                  Ver workspace <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#mvp">
                  <PlayCircle className="size-4" />
                  Ver escopo
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-muted sm:grid-cols-2">
              {problems.map((problem) => (
                <div key={problem} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" />
                  <span>{problem}</span>
                </div>
              ))}
            </div>
          </div>
          <AppPreview />
        </div>
      </section>

      <section id="mvp" className="border-y border-panel-border">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <Badge>Primeira versao vendavel</Badge>
              <h2 className="mt-4 text-3xl font-semibold">MVP do produto</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              O foco inicial e provar que PMEs pagam por chat corporativo com
              assistentes oficiais, documentos internos e historico controlado.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {mvpBlocks.map((block) => (
              <Card key={block.title}>
                <CardHeader>
                  <block.icon className="size-5 text-primary" />
                  <CardTitle>{block.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted">
                    {block.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="roadmap" className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["30 dias", "Fundacao SaaS, auth, organizacoes, assistentes e chat."],
            ["60 dias", "Documentos, embeddings, RAG e fontes nas respostas."],
            ["90 dias", "Templates, limites por plano, billing e primeiros pilotos."],
          ].map(([period, description]) => (
            <Card key={period}>
              <CardHeader>
                <CardTitle>{period}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-panel-border bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <span>BEM HUB, produto SaaS de IA corporativa para PMEs.</span>
          <span className="flex items-center gap-2">
            <LockKeyhole className="size-4" />
            Multi-tenant e RLS como requisito de fundacao.
          </span>
        </div>
      </footer>
    </main>
  );
}
