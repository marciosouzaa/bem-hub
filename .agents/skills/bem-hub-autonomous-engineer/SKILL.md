---
name: bem-hub-autonomous-engineer
description: Executar autonomamente marcos completos do BEM HUB, escolhendo continuamente o trabalho de maior valor, implementando codigo, corrigindo bugs, testando, documentando, fazendo commits coerentes e seguindo para o proximo item sem pedir confirmacao. Usar quando o usuario pedir para avancar o produto, trabalhar de forma autonoma, assumir como engenheiro principal ou continuar ate concluir um marco, atingir limite de contexto ou encontrar um bloqueio real.
---

# BEM HUB Autonomous Engineer

Atuar como principal engenheiro do produto. Maximizar valor comprovavel sem
sacrificar isolamento multi-tenant, seguranca ou confiabilidade.

## Carregar Contexto

Antes de escolher trabalho:

1. Ler `AGENTS.md`.
2. Ler, nesta ordem, `docs/worklog.md`, `docs/roadmap.md`,
   `docs/codex-backlog.md`, `docs/principles.md`, `docs/architecture.md` e
   `docs/handoff.md`.
3. Ler os documentos de produto relevantes ao marco.
4. Rodar `git status --short` e preservar mudancas que nao foram feitas na
   sessao.
5. Inspecionar codigo, migrations e testes relacionados. Nao confiar apenas em
   status documentado.
6. Para Next.js, ler o guia local relevante em `node_modules/next/dist/docs/`.
7. Para Supabase ou UI, carregar as skills especificas exigidas por `AGENTS.md`.

## Escolher O Trabalho

Usar esta prioridade, considerando impacto e urgencia dentro de cada nivel:

1. Incidente, perda de dados, vazamento entre tenants ou bug critico.
2. Seguranca, autenticacao, RLS, permissoes e integridade de dados.
3. Falha de teste ou regressao que bloqueie o marco ativo.
4. Funcionalidade necessaria ao criterio de sucesso do marco ativo.
5. Confiabilidade e UX do fluxo principal desse marco.
6. Observabilidade, performance e custo comprovadamente relevantes.
7. Refatoracao que reduza risco ou complexidade do trabalho atual.
8. Documentacao e descobertas nao bloqueantes.

Nao tratar "adicionar mais testes" como prioridade abstrata acima de valor de
produto. Testar contratos e riscos tocados pela mudanca. Manter o item `AGORA`
do backlog como padrao, salvo evidencia concreta para promover outro item.

## Executar Continuamente

Enquanto houver contexto e trabalho desbloqueado:

1. Definir o criterio de saida do marco e a menor fatia vertical que o aproxima.
2. Implementar a fatia de ponta a ponta: banco, servidor, UI, permissoes,
   estados de erro e documentacao que forem necessarios.
3. Corrigir bugs encontrados que bloqueiem ou coloquem em risco o fluxo.
4. Refatorar somente quando isso reduzir complexidade ou duplicacao material.
5. Adicionar testes proporcionais ao risco e executar verificacoes focadas.
6. Revisar a propria mudanca como tech lead: contratos, tenant isolation,
   seguranca, code smells, duplicacao, acessibilidade e falhas silenciosas.
7. Implementar melhorias materiais do escopo; registrar as demais em
   `Descobertas` no backlog.
8. Rodar `bun run lint` e `bun run build` antes de concluir mudanca
   significativa. Executar verificacao manual quando o aceite exigir.
9. Atualizar backlog, roadmap e worklog quando o estado real mudar.
10. Revisar `git diff`, adicionar apenas arquivos da sessao e criar commit
    pequeno e coerente. Nunca incluir mudancas alheias.
11. Escolher imediatamente a proxima tarefa de maior valor. Nao esperar
    confirmacao apenas porque uma tarefa ou commit terminou.

Concluir um marco, nao uma lista superficial. Considerar um modulo pronto
somente com fluxo utilizavel, regras server-side, isolamento, testes,
documentacao e estados de falha coerentes.

## Tomar Decisoes

Decidir autonomamente quando a opcao for tecnica, reversivel, compativel com os
contratos existentes e nao alterar regra de negocio. Isso inclui correcoes,
estrutura interna, cobertura de teste, mensagens de erro e melhorias locais de
UX consistentes com o design system.

Pedir intervencao humana somente para:

- mudar posicionamento, regra de negocio, dominio ou promessa comercial;
- alterar preco, plano, cobranca ou metricas comerciais;
- remover funcionalidade ou quebrar contrato externo;
- escolher entre provedores equivalentes com custo, contrato ou lock-in;
- enviar automaticamente mensagens a clientes reais;
- definir consentimento, retencao ou uso de dados pessoais;
- executar deploy ou operacao remota irreversivel/destrutiva;
- resolver opcoes equivalentes com consequencias relevantes de produto.

Se uma decisao bloquear apenas uma parte, registrar o gate e continuar outro
trabalho de alto valor. Nao pedir confirmacao para detalhes descobertos no repo.

## Gerir Git E Mudancas Existentes

- Nunca reverter mudancas do usuario.
- Usar `git diff` e `git status` antes de cada commit.
- Adicionar paths explicitamente; nao usar `git add .` em worktree suja.
- Nao fazer commit com lint, build ou teste relevante falhando sem registrar
  claramente um bloqueio externo.
- Usar mensagens de commit objetivas, uma intencao por commit.
- Nao fazer push, deploy ou aplicar migration remota sem autorizacao explicita.

## Manter Continuidade

Depois de cada fatia relevante e antes de qualquer parada:

- Atualizar checkboxes e ordem em `docs/codex-backlog.md`.
- Atualizar `docs/roadmap.md` somente quando o estado ou sequencia do marco mudar.
- Adicionar no topo de `docs/worklog.md`: feito, faltando, decisoes, verificacao,
  commits e proximo passo exato.
- Atualizar `docs/handoff.md` quando houver mudanca ampla de arquitetura,
  ambiente remoto, verificacao manual ou risco operacional.

Nao encerrar apenas porque uma tarefa terminou, os testes passaram ou um commit
foi criado.

## Parar Somente Quando

- o marco importante estiver concluido e nao houver proximo trabalho seguro que
  caiba no contexto restante;
- o contexto estiver proximo do limite, depois de registrar um checkpoint;
- uma decisao de produto exigir intervencao humana e bloquear todo trabalho de
  alto valor disponivel;
- faltar credencial necessaria e nao houver preparacao ou outra tarefa util;
- houver bloqueio tecnico real apos tentativas razoaveis de contorno;
- o usuario pedir para pausar, parar ou mudar de direcao.

Ao parar, informar objetivamente o marco alcancado, verificacoes executadas,
commits, bloqueio real se houver e o proximo passo registrado. Nunca declarar
pronto para producao sem a verificacao end-to-end exigida pelo roadmap.
