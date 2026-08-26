## 1. Evidence And Documentation

- [x] 1.1 Record in `docs/worklog.md` that connected-channel and media smokes were completed by the user before this change.
- [x] 1.2 Use Supabase MCP logs/advisors and read-only SQL to inspect the reported invite failure path: invited user, pending/active membership status, and whether the acceptance RPC ran successfully.
- [x] 1.3 Decide from evidence whether the fix is app-only or needs a new incremental SQL migration.

## 2. Invite Redirect And Acceptance

- [x] 2.1 Add focused tests for `getInvitationRedirectToUrl`, including HTTPS fallback and configured app path normalization.
- [x] 2.2 Fix `getInvitationRedirectToUrl` to default to `https://bem-hub.vercel.app/app` and keep callback/next paths correct.
- [x] 2.3 Harden `/auth/callback` so failed `exchangeCodeForSession` does not silently continue into invite acceptance as if authenticated.
- [x] 2.4 Keep `/app/invitations/accept` setting the accepted organization cookie and make failure/success redirects explicit enough for regression tests.

## 3. Workspace Selection And Linked Accounts

- [x] 3.1 Add tests for workspace option listing and selected organization persistence when a user has one or multiple active memberships.
- [x] 3.2 Fix `/auth/select-workspace` single-workspace branch to set `bem_hub_active_organization` before redirecting.
- [x] 3.3 Ensure login still redirects multi-account users to `/auth/select-workspace?next=/app` and sets the cookie for single-account users.
- [x] 3.4 Add or reuse a server-side helper that returns active linked environments for the current user without exposing other users' organizations.

## 4. Account UI

- [x] 4.1 Add a small typed client component for the `Configuracoes > Conta` linked-environments DataTable.
- [x] 4.2 Render name, slug, role label and current-account indicator in Portuguese using existing `DataTable`, `Badge`, `Card` and design tokens.
- [x] 4.3 Ensure one-account and multi-account cases render without false empty state before adding the limited self-service actions.
- [x] 4.4 Verify responsive behavior for the table inside Account layout.

## 5. Optional Database Fix

- [x] 5.1 No migration needed: remote evidence shows the acceptance RPC was not reached and current SQL allows owner-plus-team membership.
- [x] 5.2 Not applicable: no migration was added.
- [x] 5.3 Not applicable: no database change was made; remote advisors were inspected during diagnosis.

## 6. Verification

- [x] 6.1 Run focused unit/component tests for invitation URL, auth callback/acceptance behavior and linked account table logic.
- [x] 6.2 Run `bun run lint`.
- [x] 6.3 Run `bun run build`.
- [x] 6.4 Perform or document remaining manual production smoke: existing owner user accepts invitation, enters invited workspace, logs out/in, sees both accounts, and sees both in `Configuracoes > Conta`.
- [x] 6.5 Update `docs/worklog.md` with final result, exact verification, and any remaining manual checks.

## 7. Pending Invitations In Account

- [x] 7.1 Use Supabase MCP read-only evidence and advisors to define narrowly scoped pending-invitation listing and self-unlink RPC contracts.
- [x] 7.2 Create one incremental migration with protected RPCs for own pending invitations and own non-owner unlink; add pgTAP coverage.
- [x] 7.3 Add server helpers/actions that accept a pending invitation, persist its active workspace and revalidate Account.
- [x] 7.4 Render pending invitations in `Configuracoes > Conta` with an explicit acceptance action and regression tests.

## 8. Linked Environment Self-Service

- [x] 8.1 Add `Usar esta conta` actions in linked environments using the existing server-authorized workspace selection flow.
- [x] 8.2 Add destructive confirmation and `Desvincular` only for the current user's active non-owner memberships.
- [x] 8.3 When unlinking the active environment, select a remaining environment or end the session when none remains.
- [x] 8.4 Verify owner, member and admin cases cannot gain administrative powers through Account.

## 9. Verification

- [ ] 9.1 Run focused unit/component and pgTAP tests for pending invitation, switch and self-unlink authorization.
- [x] 9.2 Run Supabase advisors after migration and record actionable warnings.
- [x] 9.3 Run `bun test`, `bun run lint` and `bun run build`.
- [x] 9.4 Update worklog with deployment variables and manual production smoke for invitation, switch and unlink.

## 10. Invite First Access

- [x] 10.1 Add focused tests for invitation bridge targets and preserve code-based callback behavior.
- [x] 10.2 Add a browser-only invitation session bridge that consumes only `invite` fragments and persists the Supabase SSR session before navigation.
- [x] 10.3 Add `/auth/invite` as the configured invitation destination and use the bridge as a fallback on login when Auth redirects to Site URL.
- [x] 10.4 Present the accepted invitation page as first access when appropriate, with required password definition before workspace entry.
- [x] 10.5 Document required Supabase Auth URL configuration and production smoke for a brand-new invited user.
- [x] 10.6 Run focused tests, `bun run lint`, `bun run build`, and validate the OpenSpec change.
