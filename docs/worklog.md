# Worklog

Checkpoint curto para continuidade entre sessoes. Manter a entrada mais recente
no topo. Nao substituir `docs/handoff.md`; registrar aqui o andamento operacional
do marco ativo.

## 2026-07-13 - RAG E Chat Confiavel

### Feito

- Matriz RAG automatica cobre literal, multi-chunk, ambiguidade, falta de
  citacao e resposta inventada sem evidencia.
- Corpus offline validou 21 casos e quatro categorias sem credenciais externas.
- RPC remota `finalize_chat_completion` atomiciza mensagem, atividade e uso.
- Falhas de stream/persistencia usam logger sanitizado e evento `chat.failed`.
- Backlog, roadmap e handoff foram sincronizados com codigo e banco reais.

### Verificacao

- Suite chegou a 34 testes automatizados antes deste checkpoint.
- Lint e build passaram com Next.js 16.2.9.
- SQL remoto transacional confirmou os tres efeitos e executou rollback.

### Proximo Passo

Implementar importacao estruturada de catalogo e tabela de precos.

## 2026-07-12 - Atividade Do Chat Observavel

### Feito

- Update de `conversations.updated_at` agora exige retorno da linha afetada.
- Erro do banco ou update com zero linhas deixa log estruturado em vez de falhar
  silenciosamente e esconder conversa recente na ordenacao do historico.

### Verificacao

- `bun run test`, `bun run lint` e `bun run build` passaram.

### Proximo Passo

Continuar auditoria de persistencia e telemetria do chat.

## 2026-07-12 - Exclusao Atomica De Assistente

### Feito

- Criada e aplicada remotamente RPC `delete_assistant` com `SECURITY INVOKER`,
  search path vazio, ACL restrita e validacao server-side de admin/tenant.
- Exclusao do assistente padrao e promocao do fallback agora ocorrem na mesma
  transacao; `set_default_assistant` e delete serializam pelo lock da organizacao.
- Action deixou de encadear delete e promocao em chamadas separadas.
- Tipos Supabase incluem a nova RPC; pgTAP subiu para 49 assertions, incluindo
  ACL, invoker, promocao e tentativa cross-tenant.

### Verificacao

- `bun run test`: 27 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- Teste SQL remoto transacional confirmou exclusao e exatamente um default;
  fixtures foram descartadas por rollback.
- Advisors permaneceram sem regressao; apenas avisos conhecidos.

### Proximo Passo

Continuar falhas silenciosas restantes, com foco na persistencia do chat.

## 2026-07-12 - Assistente Padrao Atomico

### Feito

- Criada e aplicada remotamente RPC `set_default_assistant`.
- RPC e `SECURITY INVOKER`, usa search path vazio, exige admin da organizacao,
  valida assistente no tenant e atualiza todos os defaults atomicamente.
- Anon nao executa; authenticated possui execute e ainda depende de RLS/admin.
- Criacao de assistente nao limpa mais o default antes de confirmar insert; se
  promocao falhar, novo registro e removido.
- Edicao comum nao desmarca default acidentalmente; promocao e botao dedicado
  usam a RPC transacional.
- Tipos Supabase foram regenerados com a assinatura da RPC.
- pgTAP possui 40 assertions cobrindo ACL, invoker, search path, default unico e
  tentativa cross-tenant.
- Unique partial index `assistants_single_default_per_org_idx` foi aplicado e
  confirmado no remoto; pgTAP agora possui 41 assertions e rejeita dois
  defaults mesmo por escrita direta.

### Verificacao

- `bun run test`: 27 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- Validacao SQL remota confirmou ACL e atributos da funcao.

### Proximo Passo

Continuar falhas silenciosas restantes e invariantes de dados.

## 2026-07-12 - Confirmacao De Exclusao Documental

### Feito

- DELETE de documento agora exige retorno do registro realmente removido.
- Operacao bloqueada por RLS ou que afete zero linhas nao responde mais com
  sucesso falso depois da etapa de Storage.

### Verificacao

- `bun run test`: 27 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Continuar auditoria de falhas silenciosas em chat e automacoes.

## 2026-07-12 - Consistencia Da Ingestao

### Feito

- Update final para `documents.status = ready` deixou de ser ignorado; falha na
  transicao agora interrompe processamento.
- Quantidade de embeddings precisa corresponder exatamente aos chunks antes de
  qualquer insert.
- Falha depois de gravar chunks remove todos os chunks parciais do documento
  dentro do tenant antes de marcar `failed`.
- Erros de cleanup, status e telemetria sao registrados no servidor em vez de
  falharem silenciosamente.
- Serializacao em batch possui teste para resposta incompleta do provider.

### Verificacao

- `bun run test`: 27 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Continuar auditoria de consistencia em exclusao, chat e automacoes.

## 2026-07-12 - Recovery E Loading Do Workspace

### Feito

- Adicionado `src/app/app/error.tsx` seguindo contrato Next.js 16.2 com
  `unstable_retry`.
- Falhas inesperadas agora preservam AppShell, exibem mensagem operacional,
  digest quando disponivel e botao de nova tentativa.
- Erro completo fica no log do servidor/navegador e nao e exposto na UI.
- Adicionado loading compartilhado com dimensoes estaveis para header, cards e
  lista, reduzindo layout shift entre modulos.
- Animacoes de skeleton respeitam `prefers-reduced-motion`.

### Verificacao

- `bun run test`: 26 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Continuar confiabilidade e produto automatizaveis; testes manuais permanecem
fora da fila ativa conforme orientacao do usuario.

## 2026-07-12 - Extracao DOCX

### Feito

- Adicionado `mammoth@1.12.0` para extrair texto cru de DOCX no runtime Node.
- Pipeline existente agora aceita DOCX, normaliza paragrafos, cria chunks e
  embeddings pelo mesmo fluxo tenant-scoped dos demais formatos.
- Nenhum HTML do documento e renderizado; imagens, macros e formatacao nao sao
  executadas.
- DOCX vazio retorna erro especifico em vez de produzir documento pronto sem
  conteudo.
- `mammoth` foi externalizado no bundle server do Next.js.
- Testes criam OOXML minimo em memoria e cobrem extracao e arquivo vazio.

### Verificacao

- `bun run test`: 26 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Continuar lacunas automatizaveis. OCR de PDF escaneado permanece fora por custo
e escolha de provider, mas nao bloqueia documentos textuais.

## 2026-07-12 - Tipos Oficiais Do Supabase

### Feito

- `src/types/database.ts` foi substituido pelos tipos gerados do schema remoto
  com PostgREST 14.5, incluindo relationships e assinaturas RPC reais.
- Roles textuais de mensagens agora passam por narrowing/validacao antes de
  entrar no contrato do AI SDK e da UI.
- `provider` e `status`, armazenados como `text` com CHECK no banco, deixaram de
  fingir enums PostgreSQL e sao validados nas fronteiras de dominio.
- Pgvector agora usa representacao string oficial da Data API; embeddings
  continuam numericos internamente e sao serializados somente na persistencia
  e chamada RPC.
- Adicionado teste unitario da serializacao pgvector.

### Verificacao

- `bun run test`: 24 testes passaram em 7 arquivos.
- `bun run lint` passou.
- `bun run build` passou com os tipos oficiais e Next.js 16.2.9.

### Proximo Passo

Continuar proximo item local de produto sem depender de verificacao manual.

## 2026-07-12 - Migrations Remotas E RLS Consolidado

### Feito

- Aplicadas remotamente `add_foreign_key_indexes` e
  `secure_manual_automation_runs` com autorizacao do usuario.
- Validado no remoto: 15 indices esperados e 2 policies de runs presentes.
- Criada e aplicada `optimize_auth_rls_policies`: cinco policies usam initplan,
  roles explicitos e `WITH CHECK`; conversa nao pode mudar para outro tenant.
- Criada e aplicada `consolidate_permissive_policies`: policies `FOR ALL`
  sobrepostas foram separadas por acao e limitadas a `authenticated`.
- Bootstrap direto de owner foi preservado em policy unica, sem ampliar acesso.
- pgTAP passou para 34 assertions com tentativa de mover conversa entre tenants.

### Advisors Pos-Migration

- `unindexed_foreign_keys`: 0.
- `auth_rls_initplan`: 0.
- `multiple_permissive_policies`: 0.
- Restam 19 infos `unused_index`, esperadas logo apos criar indices e antes de
  carga relevante.
- Seguranca mantem 2 warnings conhecidos: bootstrap `SECURITY DEFINER`
  intencional e leaked-password protection desativada no painel Auth.

### Proximo Passo

Continuar produto sem depender de teste manual. Leaked-password protection
permanece unica configuracao de seguranca externa nao resolvida.

### Verificacao

- `bun run test`: 22 testes passaram em 6 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

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
