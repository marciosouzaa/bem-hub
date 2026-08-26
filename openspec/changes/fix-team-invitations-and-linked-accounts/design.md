## Context

See `proposal.md` for motivation. The current code already has the main pieces:

- Team invites create `organization_members.status = 'invited'`.
- `/auth/callback` exchanges the Supabase Auth code and redirects to `next`.
- `/app/invitations/accept` calls `accept_organization_member_invitation`, sets `bem_hub_active_organization`, and redirects to `/auth/invitation-accepted`.
- Login redirects to `/auth/select-workspace` when `listUserWorkspaceOptions` returns more than one active membership.
- `Configuracoes > Conta` mostra workspace atual, ambientes ativos vinculados e precisa acomodar convites pendentes do proprio usuario.

Observed and suspected gaps:

- `src/features/members/invitation-url.ts` falls back to `http://bem-hub.vercel.app/app`; production should use HTTPS.
- `/auth/select-workspace` redirects directly when there is exactly one workspace but does not set the active organization cookie in the page path.
- The accepted invitation page sends the user to `/app`, not to a multi-account selection surface; if cookie/session state is stale or acceptance failed, the user sees no diagnostic.
- Existing tests cover DB functions but not the full app-level flow from invite URL through callback, acceptance, login and workspace listing.

Supabase and Next.js constraints:

- Cookie writes must happen in Server Actions or Route Handlers.
- Redirects in Route Handlers end execution.
- Supabase Auth errors are returned in `{ error }`; code must inspect them.
- RLS and server-side checks remain the authority for membership visibility.

## Goals / Non-Goals

**Goals:**

- Make the existing-user invite flow deterministic for users who already own another account.
- Keep organization selection server-authorized and cookie-backed.
- Reuse `listUserWorkspaceOptions` for both login/selection and account visibility.
- Add a simple account-linked environments DataTable with troca de ambiente e desvinculo proprio limitado pelo papel.
- Add regression tests around URL generation, workspace option persistence and account listing behavior.
- Record the completed support channel and media smokes in operational docs.

**Non-Goals:**

- No new permission matrix.
- No alteracao de papel, convite, remocao de terceiros ou outra decisao administrativa dentro de `Configuracoes > Conta`.
- No billing/plan changes.
- No destructive remote data cleanup.
- No change to WhatsApp provider adapters in this change.

## Decisions

### Tratar ambientes vinculados como autoatendimento limitado

`Configuracoes > Conta` mostrara a tabela de memberships ativos. O usuario podera selecionar outro ambiente ativo e se desvincular somente de ambientes onde seu papel nao e `owner`. Acoes administrativas continuam em Equipe.

Alternativa considerada: reutilizar apenas a tela de selecao no login. Rejeitada porque troca recorrente de ambiente nao deve exigir encerramento de sessao.

### Expor convites pendentes por RPC restrita

RLS atual deixa o convite pendente invisivel ao convidado. Uma RPC incremental retornara somente convites em que `user_id = auth.uid()`, com campos minimos do ambiente e papel. O aceite continuara sem confiar em `organization_id` enviado pelo navegador.

Alternativa considerada: ampliar policies de `organization_members` e `organizations` para todo membership pendente. Rejeitada porque concederia visibilidade mais ampla do que a tela precisa.

### Desvincular revoga apenas membership proprio nao-owner

Uma RPC incremental validara `auth.uid()`, papel diferente de `owner` e membership ativo antes de marcar o vinculo como removido. Nenhuma acao apaga `auth.users`, organizacao propria ou membership de terceiros. Quando o ambiente removido estiver ativo, a action seleciona ambiente remanescente ou encerra a sessao se nao houver outro.

Alternativa considerada: permitir update direto sob RLS. Rejeitada porque membro comum nao tem policy administrativa para alterar `organization_members`.

### Persist selected organization whenever a single valid workspace is known

Any path that resolves exactly one valid workspace for an authenticated user should set `bem_hub_active_organization` before redirecting to `/app`. This includes the select-workspace page branch that currently redirects without writing the cookie.

Alternative considered: let `getRequiredWorkspace` infer the first workspace on every request. Rejected because a stale or absent cookie makes multi-account state harder to reason about and harder to debug.

### Keep accepted invite focused on the invited workspace

When the invitation RPC returns an organization id, `/app/invitations/accept` should set that organization as the active cookie. The confirmation page can keep its current "Entrar no workspace" CTA; after acceptance the current session should already point at the invited workspace.

Alternative considered: always redirect to `/auth/select-workspace` after accepting. Rejected because it adds friction to the main success case. The next login will still show the selector if the user has more than one active workspace.

### Bridge implicit invite sessions before server-side acceptance

Hosted Supabase Auth can return `access_token` and `refresh_token` in the URL fragment for an invite. Fragments never reach a Next.js Route Handler, so `/auth/invite` and the login fallback will use a small client component to call `setSession` locally. Only after the browser persists the SSR cookie will it navigate to `/app/invitations/accept`. Callback URLs containing a PKCE `code` continue through `/auth/callback`.

The completion page already owns password definition through `auth.updateUser`; it becomes the explicit first-access screen after an invited membership is accepted. The bridge never forwards the fragment values to query parameters, server actions or logs.

Alternative considered: parse the fragment in a Route Handler. Rejected because browsers do not send URL fragments in HTTP requests.

### Fix invite URL at the origin builder

`getInvitationRedirectToUrl` should default to `https://bem-hub.vercel.app/app` and normalize configured `BEM_HUB_PRODUCTION_APP_URL` into:

- origin from the configured URL;
- callback bridge path `/auth/invite`.

Alternative considered: hard-code the complete production callback URL. Rejected because staging and preview environments still need a configurable origin.

### Debug with remote evidence before schema changes

Before changing SQL, inspect Supabase logs/advisors and current rows/RPC behavior for the affected invited user when possible. If the problem is app-level redirect/cookie logic, avoid migration. If the RPC blocks a legitimate owner-plus-team membership, create a new incremental migration.

Alternative considered: immediately patch the RPC. Rejected because the current migration appears intended to allow a user to own one account and be team member of another; the reported symptom may be redirect/session/cookie.

## Risks / Trade-offs

- [Risk] Supabase email links may still target a dashboard-configured Site URL or blocked redirect URL. Mitigation: include a manual environment checklist and verify the generated redirect URL in tests.
- [Risk] Existing invited row may already be stale or mismatched by email/user id from the failed smoke. Mitigation: inspect remote membership by email before declaring code fixed; repair data only with explicit user approval if needed.
- [Risk] Account DataTable as a client component may increase bundle surface on Account. Mitigation: keep columns small and reuse existing DataTable already used by admin records.
- [Risk] Fixing cookie behavior could expose stale selected organization ids. Mitigation: `getRequiredWorkspace` already ignores selected ids not present in active memberships and redirects to selector when needed.
- [Risk] Usuario sem ambiente remanescente pode cair no bootstrap automatico. Mitigation: a action encerra a sessao ao remover o ultimo ambiente ativo.

## Migration Plan

1. Create an incremental migration for pending-invitation listing and self-unlink, preserving existing migrations.
2. Use Supabase MCP advisors and focused SQL verification for RPC authorization.
3. Implement account-page pending invitation, switch and self-unlink controls with server actions.
4. Deploy app changes with `BEM_HUB_PRODUCTION_APP_URL=https://bem-hub.vercel.app/app` and configure the Supabase Auth Site URL as `https://bem-hub.vercel.app` plus a Redirect URL covering `https://bem-hub.vercel.app/auth/invite`.
5. Re-run smoke:
   - owner/admin invites existing user;
   - existing user accepts e-mail link;
   - new user accepts e-mail link, defines a password and enters the invited workspace;
   - invited workspace opens;
   - logout/login shows both accounts;
   - `Configuracoes > Conta` lists, alterna e desvincula somente ambiente nao-owner.

Rollback:

- App-only rollback reverts the change.
- If a migration is added, rollback requires a forward corrective migration; applied migrations stay immutable.
