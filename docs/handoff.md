# Handoff Notes

## Completed

- Added repository guidance in `AGENTS.md`.
- Added repo-local skill `.codex/skills/bem-hub-frontend-design`.
- Added design system reference in `docs/design-system.md`.
- Configured Supabase environment through `.env.local` locally.
- Applied Supabase migrations through `0005_fix_bootstrap_rpc_conflicts`.
- Implemented auth routes:
  - `/auth/login`
  - `/auth/signup`
  - `/auth/logout`
- Added `src/proxy.ts` for Supabase SSR session refresh.
- Implemented authenticated `/app` workspace bootstrap:
  - profile upsert
  - organization creation/recovery
  - owner membership bootstrap through RPC
  - free subscription creation
- Updated `/app` to use the dark green AI operating-system design language.
- Added `.env.example`.
- Updated Supabase environment docs to prefer publishable keys via
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  remains a legacy fallback in code only.

## Verified

- `bun run lint`
- `bun run build`
- Supabase migrations are applied remotely through `0005`.

## Known Follow-Ups

- Manually verify tenant isolation with two Supabase users.
- Clean up duplicate owner organizations created during early bootstrap testing,
  if they still exist in the Supabase project.
- Generate full Supabase TypeScript types instead of maintaining partial manual
  types once the schema stabilizes.
- Revisit Supabase advisors for security/performance hardening:
  - exposed `security definer` functions
  - unindexed foreign keys
  - RLS initplan optimizations
  - duplicate permissive policies

## Next Step

Implement Assistants CRUD scoped by organization:

- list assistants
- create/edit/delete assistant
- set default assistant
- validate inputs with Zod
- enforce owner/admin management server-side
- keep member usage read-only where appropriate
