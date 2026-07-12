# Worklog

Checkpoint curto para continuidade entre sessoes. Manter a entrada mais recente
no topo. Nao substituir `docs/handoff.md`; registrar aqui o andamento operacional
do marco ativo.

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
