# Handoff Notes

Atualizado em 2026-07-12.

## Handoff 2026-07-12 - Hardening M0

- Criada a migration local
  `20260712160034_harden_tenant_security_functions.sql`.
- Criado `supabase/tests/security_hardening_test.sql` com 29 assercoes pgTAP.
- O remoto ainda nao recebeu a migration; chamada anonima a `is_org_member`
  respondeu HTTP 200 antes do hardening.
- Lint e build passaram.
- Validacao SQL, advisors, aplicacao remota, leaked-password protection e teste
  com dois usuarios estao bloqueados por ausencia de Docker local e credenciais
  de gerenciamento/banco.
- Trabalho local pode continuar no M1 RAG, mas dados reais nao devem ser
  considerados liberados ate concluir o gate remoto de M0.

## Estado Atual

BEM HUB está com a base de produto do MVP funcionando como workspace
autenticado: Supabase Auth, organização, membros, assistentes, chat,
entitlements, troca manual de plano e conexões de provedores de IA.

O foco visual atual é o console operacional escuro descrito em
`docs/design-system.md`: sidebar fixa, topbar compacta, cards escuros,
sinalização verde e páginas de trabalho em português.

## Feito

- Criado e mantido o guia operacional `AGENTS.md`.
- Criada a skill local `.codex/skills/bem-hub-frontend-design`.
- Documentado o design system em `docs/design-system.md`.
- Instaladas as skills Supabase:
  - `.agents/skills/supabase`
  - `.agents/skills/supabase-postgres-best-practices`
- Configurado MCP Supabase para o projeto `lzqugeqtcisgaztggcxq`.
- Configurado ambiente local com `.env.local`.
- Adicionado `APP_ENCRYPTION_KEY` para criptografar chaves de IA.
- Aplicadas migrations remotas Supabase até:
  - `0006_ai_provider_connections`
- Implementado auth:
  - `/auth/login`
  - `/auth/signup`
  - `/auth/logout`
  - `src/proxy.ts` para refresh de sessão SSR.
- Implementado bootstrap autenticado do workspace:
  - upsert de profile
  - criação/recuperação de organização
  - membership owner via RPC
  - assinatura free/manual inicial.
- Implementado `/app` com shell escuro, sidebar, topbar, menu de usuário,
  logout e suporte a tema.
- Implementados componentes base de layout responsivo:
  - `PageLayout`
  - `PageHeader`
  - `SectionHeader`
  - `ContentGrid`
  - `SplitPanel`
  - `ContextPanel`
  - `CommandSearch`
  - `MobileShell`
- Implementado Assistants CRUD em `/app/assistants`:
  - listar por organização
  - criar, editar, excluir
  - definir padrão
  - validar inputs com Zod
  - owner/admin gerenciam
  - member fica read-only.
- Implementado chat com persistência e streaming:
  - `/api/chat`
  - validação de payload
  - criação/reuso de conversa
  - gravação de mensagens
  - uso de instruções do assistente
  - registro de metadata de modelo/provedor
  - registro de `usage_events`
  - checagem server-side de plano/limite antes de chamar IA.
- Estruturada camada de entitlements:
  - leitura de `subscriptions` e `plans`
  - módulos por plano
  - limites por plano
  - erros padronizados para feature bloqueada, limite e assinatura.
- Criada tela de CTA/upgrade e depois migrada para settings/billing.
- Implementadas conexões de provedores de IA:
  - tabela `ai_provider_connections`
  - colunas `assistants.provider` e `assistants.provider_connection_id`
  - RLS para leitura por membro e gestão por admin
  - cadastro de chaves por organização
  - criptografia AES-256-GCM no servidor
  - suporte a OpenAI, Anthropic/Claude e Gemini via AI SDK
  - fallback para env vars legadas quando não houver conexão cadastrada
  - seleção de provider/conexão/modelo no cadastro do assistente.
- Smoke test funcional de settings/billing, settings/ai-providers,
  assistants e chat foi reportado como concluído pelo usuário em 2026-07-01.
- Implementado Knowledge Base Ingestion inicial:
  - migration `0007_knowledge_base_ingestion`
  - bucket privado Supabase Storage `knowledge-documents`
  - policies de storage por primeiro segmento do path como `organization_id`
  - colunas de metadata em `documents`: tamanho, chunks, modelo e data de
    processamento
  - upload em `/api/knowledge/documents`
  - tela `/app/knowledge`
  - validação server-side de owner/admin, plano e limite de documentos
  - extração de TXT/Markdown/PDF com texto selecionável
  - chunks e embeddings OpenAI `text-embedding-3-small`
  - busca semântica via `match_document_chunks`
  - exclusão de documentos em `/app/knowledge` para owner/admin, removendo
    objeto do Storage e chunks por cascade
  - DOCX e PDFs sem texto extraível ficam registrados como `failed` com
    mensagem clara.
- Aplicada remotamente a migration `0006_ai_provider_connections` via MCP.
- Recarregado schema cache do PostgREST com `notify pgrst, 'reload schema';`.
- Criada área de configurações com submenu:
  - `/app/settings`
  - `/app/settings/account`
  - `/app/settings/billing`
  - `/app/settings/ai-providers`
- Ajustada navegação principal:
  - removido item isolado `Plano`
  - `Configurações` agora abre a área de settings.
- Implementada troca manual de plano em `/app/settings/billing`:
  - server action `changeOrganizationPlanAction`
  - owner/admin podem ativar plano durante a construção
  - atualiza `subscriptions` com status `manual`
  - revalida rotas afetadas.
- Mantida compatibilidade:
  - `/app/upgrade` redireciona para `/app/settings/billing`
  - `UpgradeCTA` aponta para `/app/settings/billing`.
- Atualizados docs/env:
  - `.env.example`
  - `docs/architecture.md`
  - `docs/deployment-vercel.md`.

## Verificado

- `bun run lint` passou após as alterações.
- `bun run build` passou após as alterações.
- Build atual inclui as rotas:
  - `/api/knowledge/documents`
  - `/api/knowledge/documents/[documentId]`
  - `/app/knowledge`
  - `/app/settings`
  - `/app/settings/account`
  - `/app/settings/billing`
  - `/app/settings/ai-providers`
  - `/app/upgrade`
- Supabase remoto validado via MCP:
  - migration `0006_ai_provider_connections` no histórico remoto
  - migration `0007_knowledge_base_ingestion` no histórico remoto
  - `public.ai_provider_connections` criada
  - RLS ativo na tabela
  - `assistants.provider` existe
  - `assistants.provider_connection_id` existe.
  - bucket privado `storage.buckets.knowledge-documents` criado
  - colunas `documents.file_size`, `documents.chunk_count`,
    `documents.embedding_model` e `documents.processed_at` existem
  - policies `knowledge_documents_*` existem em `storage.objects`.

## Ainda Não Verificado Manualmente

- Abrir `/app/knowledge` em ambiente com Supabase Storage e OpenAI configurados.
- Enviar um TXT, Markdown ou PDF com texto selecionável e confirmar status
  `ready`, chunks e busca
  semântica.
- Excluir documentos prontos e falhos pela UI e confirmar remoção do registro,
  chunks e objeto no bucket.
- Enviar um DOCX ou PDF escaneado e confirmar status `failed` com mensagem
  clara de parser/OCR ainda não suportado.
- Verificação com dois usuários Supabase para confirmar isolamento completo
  entre organizações, incluindo objetos de Storage.

## Alertas Supabase

Advisors ainda apontam hardening pendente:

- Funções `SECURITY DEFINER` públicas executáveis por `anon`/`authenticated`:
  - `bootstrap_owned_organization`
  - `is_org_admin`
  - `is_org_member`
  - `match_document_chunks`
- Proteção contra senha vazada desativada no Supabase Auth.
- Foreign keys sem índices, incluindo novo alerta em:
  - `public.ai_provider_connections.created_by`
- Algumas políticas RLS com initplan/performance warnings.
- Algumas tabelas com múltiplas políticas permissivas.

Esses pontos não bloquearam o MVP local, mas devem virar uma migration de
hardening antes de qualquer uso com dados sensíveis reais.

## Estado Do Git

A worktree está suja com mudanças intencionais desta sessão. Não houve commit.
Antes de continuar, rode:

```powershell
git status --short
```

Arquivos novos importantes:

- `supabase/migrations/0006_ai_provider_connections.sql`
- `supabase/migrations/0007_knowledge_base_ingestion.sql`
- `src/features/ai-provider-connections/*`
- `src/features/knowledge-base/*`
- `src/lib/ai/providers.ts`
- `src/lib/ai/runtime.ts`
- `src/lib/ai/embeddings.ts`
- `src/lib/security/encryption.ts`
- `src/lib/supabase/schema-errors.ts`
- `src/app/api/knowledge/documents/route.ts`
- `src/app/app/knowledge/page.tsx`
- `src/app/app/settings/*`
- `src/components/app/settings-nav.tsx`
- `src/features/billing/actions.ts`
- `src/features/billing/plan-change-button.tsx`

Arquivos de logo em `public/` também aparecem como não rastreados:

- `public/bh16.svg`
- `public/logo-bh32.svg`
- `public/logo-bh64.svg`

## Próximo Passo Recomendado

Fazer smoke test da nova tela `/app/knowledge` com a migration
`0007_knowledge_base_ingestion` já aplicada no Supabase remoto:

1. Enviar TXT, Markdown ou PDF com texto selecionável.
2. Confirmar objeto no bucket privado `knowledge-documents`.
3. Confirmar documento `ready`, chunks gravados e evento de uso.
4. Rodar busca semântica na própria tela.
5. Excluir um documento e confirmar remoção do Storage, `documents` e chunks.
6. Confirmar que DOCX e PDF escaneado aparecem como `failed` com mensagem clara.
7. Repetir checagem com dois usuários/organizações para isolamento em tabelas e
   Storage.

Depois disso, o próximo bloco pelo backlog é RAG Answering:

- recuperar top chunks antes da resposta do chat
- injetar contexto no prompt
- retornar fontes/citacoes para a UI

## Handoff 2026-07-07

Resumo da sessao:

- Smoke test reportado pelo usuario:
  - upload/processamento de TXT funciona.
  - upload/processamento de PDF com texto selecionavel passou depois da
    correcao do parser.
- Corrigido erro de PDF no Next.js:
  - `next.config.ts` externaliza `pdf-parse` e `pdfjs-dist` via
    `serverExternalPackages`.
  - `/api/knowledge/documents` declara `runtime = "nodejs"`.
  - Isso evita o erro de `pdf.worker.mjs` sendo procurado dentro de
    `.next/dev/server/chunks`.
- Implementado download do arquivo original:
  - `GET /api/knowledge/documents/[documentId]`.
  - rota autenticada.
  - busca `documents` filtrando por `id` e `organization_id`.
  - gera signed URL de 5 minutos no bucket privado `knowledge-documents`.
  - UI de `/app/knowledge` ganhou botao `Baixar` em cada card.
  - membros podem baixar documentos visiveis; exclusao segue restrita a
    owner/admin.

Verificacao desta sessao:

- `bun run lint` passou apos a correcao de PDF.
- `bun run build` passou apos a correcao de PDF.
- `bun run lint` passou apos adicionar download.
- `bun run build` passou apos adicionar download.

Pendente:

- Confirmar manualmente download pela UI em um documento pronto e um falho.
- Confirmar exclusao removendo Storage, `documents` e chunks.
- Testar Markdown.
- Testar DOCX/PDF escaneado como `failed` com mensagem clara.
- Repetir verificacao com dois usuarios/organizacoes para isolamento em tabelas
  e Storage quando houver credenciais disponiveis.

Proxima sessao:

Comecar RAG Answering. A base de conhecimento ja tem upload, processamento,
chunks, embeddings, busca semantica, exclusao e download do arquivo original.
O primeiro slice recomendado:

1. Recuperar top chunks da organizacao antes da resposta do chat.
2. Injetar contexto documental no prompt do assistente.
3. Fazer o assistente responder quando o contexto for insuficiente.
4. Retornar fontes para a UI do chat.
5. Manter limites/entitlements e isolamento por `organization_id` no servidor.

## Handoff 2026-07-09

Preparacao do benchmark RAG:

- O usuario processou com sucesso quatro arquivos Markdown em `/app/knowledge`.
- A tela reportou 4 documentos prontos, 49 chunks e nenhuma falha.
- Os documentos corporativos indexados foram:
  - `manual-de-reembolsos.md`
  - `politica-de-ferias.md`
  - `operacao-cliente-orion.md`
- `roteiro-de-validacao-rag.md` tambem foi processado, mas contem o gabarito e
  deve ser excluido da base de conhecimento antes de qualquer validacao RAG.
- Os artefatos externos de benchmark estao versionados em `docs/benchmarks`:
  - `benchmark-rag.csv`
  - `benchmark-rag.json`
  - `benchmark-rag.yaml`
- Esses tres arquivos de benchmark nao devem ser enviados nem indexados na base
  de conhecimento.

Nao foi executado teste RAG nesta sessao. O chat ainda precisa receber a
implementacao do bloco RAG Answering antes da validacao ponta a ponta.

Proxima sessao:

1. Excluir `roteiro-de-validacao-rag.md` de `/app/knowledge` para remover o
   gabarito dos chunks pesquisaveis.
2. Implementar recuperacao dos top chunks da organizacao no fluxo de chat.
3. Injetar o contexto recuperado no prompt sem expor dados entre organizacoes.
4. Retornar e exibir as fontes usadas na resposta.
5. Executar o benchmark externo, incluindo perguntas sem resposta, e comparar
   resultado, documento citado e comportamento esperado.
