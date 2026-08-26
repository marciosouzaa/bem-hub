## Why

O fluxo de convite de equipe falha no caso comercial mais importante: um usuario que ja possui uma conta propria como responsavel aceita convite para outra conta, mas nao passa a enxergar as duas contas no login. A tela de Conta tambem nao mostra ao usuario quais ambientes estao vinculados ao proprio acesso, dificultando diagnostico e suporte.

## What Changes

- Corrigir o aceite de convite para usuario existente, garantindo que o callback autentique, ative o membership convidado e direcione o usuario para selecao/entrada no workspace correto.
- Corrigir a selecao multi-conta para sempre persistir o cookie `bem_hub_active_organization`, inclusive quando houver apenas uma conta ativa.
- Trocar o fallback do redirect de convite para HTTPS e exigir origem tecnica correta em producao.
- Adicionar uma secao em `Configuracoes > Conta` com DataTable simples de ambientes vinculados ao usuario atual.
- Mostrar nome da conta, slug, papel do usuario, status ativo, e indicador da conta em uso.
- Exibir convites pendentes do proprio usuario em `Configuracoes > Conta` e permitir aceite autenticado sem depender do e-mail.
- Permitir alternar o ambiente ativo pela tabela de ambientes vinculados sem encerrar a sessao.
- Permitir que usuario se desvincule apenas de ambientes em que e membro ou admin, nunca de ambiente proprio como owner.
- Concluir o primeiro acesso de usuario criado por convite: consumir com seguranca a sessao retornada no fragmento do e-mail, aceitar o membership e permitir definir senha antes de entrar no workspace.
- Registrar nos docs/worklog que os smokes de canal conectado e midia foram concluidos antes desta correcao.

## Capabilities

### New Capabilities
- `settings/team-membership`: cobre aceite de convites, selecao multi-conta e visibilidade dos ambientes vinculados ao usuario.

### Modified Capabilities
- Nenhuma.

## Impact

- `src/features/members/*`: URLs de convite, actions e tratamento de erro.
- `src/app/auth/callback/route.ts`: troca de codigo por sessao e encaminhamento seguro.
- `src/app/app/invitations/accept/route.ts`: aceite de convite, cookie da organizacao e destino final.
- `src/app/auth/select-workspace/*`: selecao e cookie quando houver uma ou muitas contas.
- `src/features/organizations/bootstrap.ts` e `queries.ts`: listagem reutilizavel de workspaces vinculados.
- `src/app/app/settings/account/page.tsx`: nova secao com DataTable.
- `src/features/members/*` e `src/features/organizations/*`: listagem de convites pendentes, aceite, troca e desvinculo do proprio usuario.
- `src/app/auth/*` e `src/lib/supabase/browser.ts`: ponte de sessao de convite no navegador e tela de primeiro acesso.
- `docs/worklog.md` e possivelmente `docs/handoff.md`: checkpoint dos smokes concluidos e estado do fluxo de convites.
- Supabase remoto: migration incremental para expor somente convites pendentes do proprio usuario e permitir desvinculo proprio nao-owner; sem alterar migrations ja aplicadas.
