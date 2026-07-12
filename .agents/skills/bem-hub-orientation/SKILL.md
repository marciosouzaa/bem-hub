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
3. Read `docs/worklog.md`, `docs/roadmap.md`, and `docs/codex-backlog.md` before
   choosing implementation work.
4. Read `docs/principles.md` before making autonomous technical decisions.
5. If UI is involved, read `docs/design-system.md` and use
   `.codex/skills/bem-hub-frontend-design/SKILL.md`.
6. If Next.js behavior is involved, read the relevant local guide under
   `node_modules/next/dist/docs/` before writing code.
7. Check `git status --short` and preserve unrelated user changes.

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

Use `docs/codex-backlog.md` as the live source. At the 2026-07-12 checkpoint,
the active work is M0 security hardening, followed by M1 RAG answering with
persisted sources and benchmark validation.

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
