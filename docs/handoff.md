# Handoff Notes

Atualizado em 2026-06-28.

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
  - `/app/settings`
  - `/app/settings/account`
  - `/app/settings/billing`
  - `/app/settings/ai-providers`
  - `/app/upgrade`
- Supabase remoto validado via MCP:
  - migration `0006_ai_provider_connections` no histórico remoto
  - `public.ai_provider_connections` criada
  - RLS ativo na tabela
  - `assistants.provider` existe
  - `assistants.provider_connection_id` existe.

## Ainda Não Verificado Manualmente

- Criar uma conexão real em `/app/settings/ai-providers` depois da migration.
- Criar/editar assistente usando uma conexão cadastrada.
- Enviar mensagem no chat usando assistente com provider selecionado pela conta.
- Trocar plano em `/app/settings/billing` e confirmar visualmente que limites e
  bloqueios mudam sem refresh manual.
- Verificação com dois usuários Supabase para confirmar isolamento completo
  entre organizações.

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
- `src/features/ai-provider-connections/*`
- `src/lib/ai/providers.ts`
- `src/lib/ai/runtime.ts`
- `src/lib/security/encryption.ts`
- `src/lib/supabase/schema-errors.ts`
- `src/app/app/settings/*`
- `src/components/app/settings-nav.tsx`
- `src/features/billing/actions.ts`
- `src/features/billing/plan-change-button.tsx`

Arquivos de logo em `public/` também aparecem como não rastreados:

- `public/bh16.svg`
- `public/logo-bh32.svg`
- `public/logo-bh64.svg`

## Próximo Passo Recomendado

Na próxima sessão, começar por smoke test funcional das telas recém-criadas:

1. Abrir `/app/settings/billing`.
2. Trocar plano para `Pro` e confirmar que a assinatura atual muda.
3. Abrir `/app/settings/ai-providers`.
4. Cadastrar uma conexão OpenAI com chave real.
5. Abrir `/app/assistants`.
6. Editar/criar assistente escolhendo provider/conexão/modelo.
7. Abrir `/app/chat` e testar uma mensagem com esse assistente.
8. Se tudo passar, seguir para Knowledge Base Ingestion.

Depois do smoke test, o próximo bloco de implementação pelo backlog é:

- upload de documentos
- storage Supabase
- extração de texto
- chunks
- embeddings
- busca semântica
