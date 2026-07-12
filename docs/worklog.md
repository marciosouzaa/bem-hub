# Worklog

Checkpoint curto para continuidade entre sessoes. Manter a entrada mais recente
no topo. Nao substituir `docs/handoff.md`; registrar aqui o andamento operacional
do marco ativo.

## 2026-07-12 - Automacoes Manuais Verticais

### Feito

- Criada rota `/app/automations` com resumo, rascunho de resposta ao cliente e
  checklist operacional.
- Adicionados tambem relatorio estruturado e conversao de notas de reuniao em
  tarefas; dados ausentes permanecem explicitos e compromissos nao sao
  inventados.
- Analise de planilha aceita CSV/TSV colado, nao executa formulas, URLs ou
  instrucoes de celulas e explicita formato invalido ou truncado.
- Execucao valida input com Zod, entitlement `automations`, sessao e
  organizacao no servidor.
- Provider, conexao e modelo sao resolvidos pelo assistente padrao do tenant;
  UI nao escolhe nem injeta configuracao de provider.
- Inputs sao tratados como dados nao confiaveis; templates proibem seguir
  instrucoes embutidas, inventar fatos ou prometer condicoes nao confirmadas.
- Runs persistem estados `running`, `succeeded` e `failed`, resultado, erro e
  evento `automation.completed` com tokens.
- Historico permite reabrir resultados persistidos e nunca envia mensagens ou
  executa efeito externo automaticamente.
- Migration `20260712221934_secure_manual_automation_runs.sql` restringe update
  ao criador autenticado dentro da organizacao.
- pgTAP de hardening passou de 29 para 33 assertions, cobrindo leitura e update
  cruzados de runs, update proprio e spoof de `created_by`.

### Verificacao

- `bun run test`: 22 testes passaram em 6 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9 e rota `/app/automations`.

### Proximo Passo

Ampliar cobertura de falhas da action sem depender de chamada real ao provider
e manter migration pronta para aplicacao remota autorizada.

## 2026-07-12 - Navegacao Alinhada Ao Produto Real

### Feito

- Removidos do menu cinco atalhos sem rota propria que redirecionavam para o
  dashboard: Agentes IA, Automacoes, Documentos, Analytics e Time.
- Navegacao agora apresenta apenas Dashboard, Assistentes, Conversas, Base de
  conhecimento e Configuracoes, todos com fluxos utilizaveis.
- Modulos futuros permanecem no roadmap e voltam ao menu quando entregarem uma
  fatia vertical real.

### Verificacao

- `bun run test`: 18 testes passaram em 5 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Preparar automacoes manuais como nova rota somente junto de contrato de
execucao, persistencia, entitlement e estados de falha; nao expor shell vazio.

## 2026-07-12 - Indices De Foreign Keys

### Feito

- Criada via Supabase CLI a migration
  `20260712215654_add_foreign_key_indexes.sql`.
- Adicionados 15 indices idempotentes para foreign keys ainda nao cobertas por
  PK, unique ou indice composto existente.
- Cobertos owners, planos, criadores, assistentes de conversa, usuarios,
  organizacoes, automacoes e conexoes de IA.
- Nenhuma policy, permissao, dado ou contrato da Data API foi alterado.

### Verificacao

- `bun run test`: 18 testes passaram em 5 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- `supabase db lint --local` tentou executar e retornou
  `Failed to connect`; banco local/Docker segue indisponivel.

### Proximo Passo

Manter migration local commitada. Aplicacao remota nao sera feita sem
autorizacao explicita. Continuar hardening e produto que possam ser validados
pela suite automatizada.

## 2026-07-12 - Dashboard Sem Dados Ficticios

### Feito

- Removidas conversas, assistentes, percentuais, integracoes, latencia, uptime
  e sincronizacao ficticios do dashboard.
- Resumo agora usa listas reais de assistentes, documentos e conversas da
  organizacao autenticada.
- Conversas recentes apontam para historico real; ausencia de dados possui
  estado vazio e CTA utilizavel.
- Cards exibem documentos prontos, chunks pesquisaveis, assistente padrao e
  uso registrado sem alegar estados nao observados.
- Onboarding passou a derivar progresso das mesmas consultas, eliminando tres
  contagens duplicadas por carregamento.
- Contexto lateral mostra organizacao, papel, saude documental e perguntas sem
  evidencia, sem simular integracoes ainda inexistentes.

### Verificacao

- `bun run test`: 18 testes passaram em 5 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- QA manual/visual nao bloqueia continuidade conforme orientacao do usuario.

### Proximo Passo

Auditar proximos fluxos locais por dados ficticios, estados incompletos e riscos
server-side. Manter gates externos registrados sem interromper trabalho
automatizavel.

## 2026-07-12 - Modelo Configuravel De Catalogo

### Feito

- Formulario de novo assistente ganhou modelo de catalogo com nome da marca e
  tres tons de voz configuraveis.
- Modelo preenche nome, area, descricao e instrucoes, mantendo tudo editavel
  antes da persistencia.
- Instrucoes exigem evidencia documental, citacao, abstinencia para preco,
  estoque e politica ausentes, esclarecimento de ambiguidade e revisao humana
  para excecoes sensiveis.
- Contrato continua usando campos existentes; nenhuma migration ou regra de
  negocio nova foi necessaria.
- Gerador do modelo possui testes para linguagem, limites e fallback de marca.

### Verificacao

- `bun run test`: 18 testes passaram em 5 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Avancar trabalho local independente de dados do piloto. Convites, importacao e
auditoria comercial permanecem gates externos, mas nao bloqueiam hardening,
qualidade do dashboard ou preparacao tecnica dos fluxos seguintes.

## 2026-07-12 - Metricas Operacionais Do Assistente

### Feito

- Reutilizados eventos `chat.completion` existentes para medir conclusoes nas
  ultimas 24 horas, nos ultimos 7 dias e perguntas sem evidencia documental.
- Dashboard substituiu percentual ficticio por metricas reais da organizacao.
- Consulta filtra `organization_id`, periodo e status RAG no servidor.
- Metricas ficam restritas a owner/admin, alinhadas a policy RLS de
  `usage_events`; membros recebem estado informativo sem consulta proibida.
- Calculo defensivo impede contagem sem evidencia acima do total do periodo.

### Verificacao

- `bun run test`: 16 testes passaram em 4 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Convite seguro de membros e importacao do catalogo continuam dependentes,
respectivamente, de fluxo de entrega/aceite e arquivos reais do piloto.
Auditoria da plataforma depende de informacao da cliente.

## 2026-07-12 - Onboarding Contextual Do Workspace

### Feito

- Dashboard ganhou checklist de primeiros 15 minutos baseado no estado real da
  organizacao: assistente existente, documento pronto e primeira conversa.
- Consultas executam em paralelo no servidor e filtram explicitamente por
  `organization_id`, preservando RLS e isolamento multi-tenant.
- Progresso aponta somente para a proxima acao disponivel no produto e some
  quando o fluxo essencial termina.
- Adicionados progresso acessivel, estados concluidos com texto e layout
  responsivo para desktop/mobile.
- Calculo do onboarding coberto por testes unitarios.

### Verificacao

- `bun run test`: 14 testes passaram em 3 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- QA visual nao executado porque o navegador integrado nao esta disponivel.

### Proximo Passo

Instrumentar ativacao e uso diario com eventos organizacionais sem duplicar os
eventos de IA existentes. Convites permanecem pendentes porque exigem fluxo
seguro de membership e entrega de convite; importacao do catalogo depende dos
arquivos reais do piloto.

## 2026-07-12 - Avaliacao Do Benchmark RAG Endurecida

### Feito

- Corrigido o runner para respeitar `must_find_documents`,
  `must_cite_sections` e `allow_partial` definidos no corpus.
- Respostas com parafrase deixaram de receber aprovacao automatica sem
  avaliacao semantica; agora ficam explicitamente em `REVIEW`.
- Saida por caso diferencia `PASS`, `FAIL` e `REVIEW`.
- Resumo do relatorio passou a detalhar resultados por categoria.
- Adicionados testes para criterios opcionais, evidencia parcial e revisao de
  parafrases.

### Verificacao

- `bun run test`: 11 testes passaram em 2 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Bloqueio E Proximo Passo

Benchmark real continua bloqueado porque `.env.local` nao possui
`BEM_HUB_BENCHMARK_ACCESS_TOKEN` nem `BEM_HUB_BENCHMARK_ORGANIZATION_ID`.
Obter token curto de usuario e organizacao do corpus, remover o documento com
gabarito da base e executar `bun run benchmark:rag`; revisar todos os casos
`REVIEW` antes de calibrar retrieval ou prompt.

## 2026-07-12 - Runner Do Benchmark RAG

### Feito

- Criado `scripts/benchmark-rag.ts` com schema Zod para o corpus oficial.
- Adicionado modo `--validate-only`, filtros por categoria, limite de casos e
  caminho de saida configuravel.
- Execucao real exige token curto de usuario, organizacao e assistente opcional;
  nenhum segredo e escrito no relatorio.
- Runner usa os mesmos retrieval, prompt, provider runtime e entitlements do
  produto, sem persistir conversas ou eventos de uso.
- Relatorio registra resposta, fontes, citacao, abstinencia, latencia, erros e
  casos que ainda exigem revisao humana.
- Resultados gerados ficam ignorados em `output/benchmarks`.

### Verificacao

- `bun run benchmark:rag -- --validate-only` validou 21 casos: 10 literais, 5
  multi-chunk, 3 ambiguos e 3 sem resposta.
- `bun run test`: 8 testes passaram em 2 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Bloqueio E Proximo Passo

Definir temporariamente `BEM_HUB_BENCHMARK_ACCESS_TOKEN` e
`BEM_HUB_BENCHMARK_ORGANIZATION_ID` em `.env.local`, remover da base remota o
documento com gabarito e executar `bun run benchmark:rag`. Revisar os casos
marcados e calibrar o threshold somente depois do relatorio.

## 2026-07-12 - M1 RAG Vertical Implementado

### Feito

- Chat consulta apenas quando o plano libera knowledge base e ha documentos
  prontos; organizacoes sem documentos continuam usando o chat normalmente.
- Busca semantica ganhou threshold inicial de `0.45`, limite de 8 chunks, ate 3
  chunks por documento e 12 mil caracteres de contexto.
- Chunks foram agrupados por documento e injetados como fontes numeradas.
- Prompt trata documentos como entrada nao confiavel, exige evidencia para fatos
  internos e instrui resposta explicita quando faltar contexto.
- Contexto RAG e persistido em `messages.metadata.knowledge` e em usage metadata.
- O stream envia contexto compacto em header para exibir fontes sem esperar
  recarregar o historico.
- UI mostra documentos consultados, quantidade de trechos e estados sem
  evidencia/documentos, com links autenticados para os originais.
- Corrigida navegacao de conversa nova para nao remontar o componente durante o
  streaming.
- Busca vetorial agora exclui documentos que nao estejam `ready`.

### Verificacao

- `bun test`: 5 testes passaram, cobrindo threshold, agrupamento, limite por
  documento, header UTF-8 e regras do prompt.
- `bun run lint` passou sem warnings.
- `bun run build` passou com Next.js 16.2.9.
- `/api/chat` sem sessao retorna 401 no servidor local.
- Servidor de desenvolvimento existente continua em `http://localhost:3000`.

### Pendente

- Executar benchmark RAG com os documentos remotos e remover antes o roteiro que
  contem o gabarito.
- Validar respostas literais, multi-chunk, ambiguas e sem resposta.
- Confirmar persistencia e fontes apos recarregar uma conversa autenticada.
- Verificar visualmente desktop/mobile; navegador integrado e credenciais de
  login nao estavam disponiveis nesta sessao.
- Ajustar threshold apenas com evidencias do benchmark.

### Proximo Passo

Executar o benchmark autenticado e corrigir qualidade/citacoes. Se a credencial
continuar indisponivel, criar um runner de benchmark desacoplado da UI com
entrada por organizacao e relatorio comparavel, sem indexar o gabarito.

## 2026-07-12 - M0 Hardening Preparado

### Feito

- Auditadas funcoes privilegiadas, policies RLS, Storage e rotas de documento.
- Confirmado no remoto atual que `anon` ainda executa `is_org_member` e recebe
  HTTP 200, demonstrando a exposicao antes da migration.
- Criada `20260712160034_harden_tenant_security_functions.sql` pelo Supabase CLI.
- Movidos helpers privilegiados para schema `private`; wrappers publicos e busca
  vetorial passaram a `SECURITY INVOKER`.
- Mantido apenas o bootstrap como RPC publica `SECURITY DEFINER`, com validacao
  de owner por `auth.uid()`.
- Revogada execucao de `PUBLIC`/`anon`, fixado `search_path` vazio e limitado o
  retorno da busca vetorial a 20 chunks.
- Criado pgTAP transacional com 29 assercoes para ACLs, funcoes, RLS, busca,
  Storage, delecao cruzada e bootstrap com dois tenants.

### Verificacao

- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- `git diff --check` passou antes do checkpoint.
- `supabase db lint --local` e `supabase test db --local` nao executaram porque
  Docker/Supabase local nao esta disponivel.

### Bloqueios Operacionais

- `SUPABASE_ACCESS_TOKEN` e database password nao estao disponiveis para
  advisors, aplicacao remota ou pgTAP linked.
- A protecao contra senha vazada depende de acesso ao projeto/painel Supabase.
- O teste manual com duas contas reais permanece pendente.

### Proximo Passo

Executar reset/lint/pgTAP em um Supabase local ou linked, corrigir qualquer
falha, aplicar a migration remotamente com autorizacao, rodar advisors e repetir
o teste anonimo. Enquanto esse gate operacional estiver bloqueado, iniciar a
preparacao local do M1 pelo contrato de fontes e recuperacao RAG no servidor.

## 2026-07-12 - Roadmap E Autonomia

### Feito

- Revisado o roadmap do piloto de cosmeticos em PDF contra o estado real do repo.
- Reorganizado o roadmap em marcos M0 a M4 com criterios mensuraveis.
- Convertido o backlog em fila executavel com `AGORA`, `DEPOIS` e descobertas.
- Criados principios de engenharia, decisao e seguranca.
- Criada a skill `$bem-hub-autonomous-engineer` para execucao continua.

### Decisoes

- O codigo e o benchmark sao a fonte da verdade: RAG no chat ainda nao esta pronto.
- WhatsApp e inteligencia de negocio sao extensoes do piloto apos validar o
  assistente interno, nao atalhos sobre o RAG incompleto.
- Hardening e verificacao multi-tenant bloqueiam uso de dados reais.
- O agente pode decidir mudancas tecnicas reversiveis, mas nao decisoes de
  produto, cobranca, fornecedor, envio real ou operacoes remotas irreversiveis.

### Falta

- Implementar e validar a migration de hardening do marco M0.
- Executar teste de isolamento com dois usuarios Supabase.
- Conectar busca semantica ao chat e exibir fontes no marco M1.

### Verificacao

- Skill validada com `quick_validate.py`.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- Nenhum commit foi criado nesta configuracao inicial.

### Proximo Passo

Iniciar M0 pelo inventario das funcoes `SECURITY DEFINER`, criar migration que
restrinja execucao e adicionar uma verificacao reproduzivel de isolamento. Em
seguida, sem esperar confirmacao, continuar para RAG no chat se nao houver
bloqueio de credencial ou decisao de produto.

## 2026-07-12 - Hardening Remoto Aplicado

### Feito

- Reautenticado o Supabase MCP com `codex mcp login supabase`.
- Instaladas as skills `supabase` e `supabase-postgres-best-practices`.
- Aplicada remotamente a migration
  `20260712160034_harden_tenant_security_functions.sql`.
- Corrigido o SQL de recuperacao vetorial para qualificar o operador
  `extensions.<=>` com `OPERATOR(...)`, permitindo aplicar a migration com
  `search_path` vazio.
- Validados `list_migrations`, `get_advisors` de seguranca e performance.
- Instalada a skill `JuliusBrussee/caveman` pedida pelo usuario.

### Decisoes

- Manter `bootstrap_owned_organization` como o unico RPC `SECURITY DEFINER`
  exposto em `public`, porque o fluxo de bootstrap ainda depende dele.
- Qualificar operadores de vector search explicitamente em vez de reabrir o
  `search_path`, para preservar o hardening.

### Falta

- Verificar com dois usuarios reais o isolamento de tabelas, RPCs, Storage e
  download assinado.
- Resolver ou aceitar os advisories remanescentes de autenticacao e indices.
- Rodar o teste manual com dois usuarios quando houver credenciais disponíveis.

### Verificacao

- `mcp__supabase.apply_migration` retornou `success: true`.
- `mcp__supabase.list_migrations` passou a incluir
  `20260712160034_harden_tenant_security_functions`.
- `mcp__supabase.get_advisors` reportou o warning esperado sobre
  `bootstrap_owned_organization` como `SECURITY DEFINER` exposto.
