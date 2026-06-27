---
name: bem-hub-orientation
description: Retomar rapidamente o contexto do projeto BEM HUB no inicio de uma nova sessao ou apos uma pausa. Use quando o usuario pedir orientacao, handoff, retomada, "onde paramos", "proximo passo", contexto do projeto, ou quando Codex precisar se alinhar ao produto, backlog, arquitetura, riscos, design system e estado atual antes de planejar ou editar o repositorio.
---

# BEM HUB Orientation

Use this skill as the first-pass operating context for BEM HUB sessions. Keep it
short, then read the source docs relevant to the actual task.

## Startup Protocol

1. Read `AGENTS.md` first. It is the repository operating guide.
2. Read `docs/handoff.md` for the latest known completed work, verification,
   follow-ups, and next step.
3. Read `docs/codex-backlog.md` before choosing implementation work.
4. If UI is involved, read `docs/design-system.md` and use
   `.codex/skills/bem-hub-frontend-design/SKILL.md`.
5. If Next.js behavior is involved, read the relevant local guide under
   `node_modules/next/dist/docs/` before writing code.
6. Check `git status --short` and preserve unrelated user changes.

## Project Snapshot

BEM HUB is a SaaS AI workspace for Brazilian SMBs. The MVP starts as a
corporate AI chat with official assistants, company documents, history, tenant
isolation, usage events, and billing foundations.

Target customers are Brazilian companies with 5 to 200 employees, especially
accounting firms, real estate agencies, clinics, marketing agencies,
e-commerces, service providers, and support operations. The buyer is usually an
owner, manager, or operations coordinator who wants productivity without a
technical team.

The product promise is practical: put AI to work in company processes with
assistants, documents, integrations, and automations in one workspace.

## Current Stack

- Next.js App Router, React, TypeScript.
- Tailwind CSS v4 and shadcn-style local components.
- Supabase Auth, PostgreSQL, Storage, RLS, and pgvector.
- Vercel AI SDK with OpenAI provider first.
- Zod, React Hook Form, TanStack Query, Zustand.
- Bun is preferred for local scripts because the repo has `bun.lock`.

## Hard Rules

- Preserve multi-tenancy on every data-access change.
- Every business table must carry `organization_id`.
- RLS is mandatory; think through "user A cannot read organization B data".
- Keep permission checks, billing limits, AI limits, and business rules
  server-side.
- Keep AI provider/model selection configurable; do not hard-code provider
  assumptions in UI components.
- Keep UI copy in Portuguese by default.
- Keep changes small and aligned to `docs/codex-backlog.md`.

## Current State

According to `docs/handoff.md`:

- `AGENTS.md`, product docs, design system, and the repo-local UI skill exist.
- Supabase migrations have been applied through `0005_fix_bootstrap_rpc_conflicts`.
- Auth routes exist for login, signup, and logout.
- Authenticated `/app` workspace bootstrap exists with profile upsert,
  organization creation/recovery, owner membership bootstrap through RPC, and
  free subscription creation.
- `/app` uses the dark green AI operating-system design language.
- `.env.example` exists.
- `bun run lint` and `bun run build` were verified at handoff time.

Known follow-ups:

- Manually verify tenant isolation with two Supabase users when credentials are
  available.
- Clean duplicate owner organizations from early bootstrap testing if needed.
- Generate full Supabase TypeScript types once the schema stabilizes.
- Revisit Supabase advisors for security and performance hardening.

## Next Recommended Work

Prioritize Assistants CRUD unless the user explicitly redirects:

- List assistants scoped by organization.
- Create, edit, and delete assistants.
- Set the default assistant.
- Validate inputs with Zod.
- Enforce owner/admin management server-side.
- Keep member usage read-only where appropriate.

After that, continue in backlog order: chat persistence and streaming,
knowledge base ingestion, RAG answering, manual automation templates, then
billing and limits.

## UI Orientation

Use the "AI Operating System" direction: dark, focused, technical, calm, and
dense enough for daily work. Preserve the green operational signal from
`docs/design-system.md` and `src/app/globals.css`.

Prefer fixed sidebar, compact topbar, searchable command area, low-contrast
cards, icon tiles, and explicit status indicators. Avoid generic marketing
polish inside the workspace.

## Verification

For meaningful code changes, run:

```powershell
bun run lint
bun run build
```

For auth, RLS, and organization-scoped features, also state whether manual
two-user Supabase verification was performed or remains pending.
