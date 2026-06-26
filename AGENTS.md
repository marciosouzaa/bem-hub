<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BEM HUB Agent Guide

Use this file as the operating guide whenever work resumes in this repository.
The project context lives in `docs/`; read the relevant docs before planning or
editing. If the task touches Next.js behavior, also read the relevant local
Next.js guide under `node_modules/next/dist/docs/` first.

## Product Context

BEM HUB is a SaaS AI workspace for Brazilian SMBs. The first commercial promise
is: put AI to work in company processes with assistants, documents,
integrations, and automations in one workspace.

Target customers are Brazilian SMBs with 5 to 200 employees, especially
accounting firms, real estate agencies, clinics, marketing agencies,
e-commerces, service providers, and support operations. The buyer is usually an
owner, manager, or operations coordinator who wants productivity without a
technical team.

The MVP is not an autonomous-agent platform. It starts as a corporate AI chat
with official assistants, company documents, history, tenant isolation, and
usage/billing foundations.

## Required Reading

- `README.md`: stack, setup, project structure, and first implementation tasks.
- `docs/product-vision.md`: positioning, customer, and success criteria.
- `docs/mvp.md`: scope and explicit out-of-scope boundaries.
- `docs/architecture.md`: technical principles and app boundaries.
- `docs/codex-backlog.md`: current task order, acceptance criteria, and likely
  files.
- `docs/roadmap.md`: 30/60/90 day sequencing.
- `docs/risks.md`: product, technical, and commercial risks to guard against.
- `docs/commercial-validation.md`: pilot packaging and validation metrics.
- `docs/design-system.md`: visual language, UI tokens, component direction,
  and product voice for interface work.
- `.codex/skills/bem-hub-frontend-design/SKILL.md`: repo-local skill for UI
  design tasks. Use it whenever changing app screens or shared UI components.

## Current Stack

- Next.js App Router, React, TypeScript.
- Tailwind CSS v4 and shadcn-style local components.
- Supabase Auth, PostgreSQL, Storage, RLS, and pgvector.
- Vercel AI SDK with OpenAI provider first.
- Zod, React Hook Form, TanStack Query, Zustand.
- Local UI primitives live in `src/components/ui`.
- Product domains live in `src/features`.
- Infrastructure helpers live in `src/lib`.
- Database schema and policies live in `supabase/migrations`.

## Architecture Rules

- Multi-tenancy is mandatory from the first implementation step.
- Every business table must carry `organization_id`.
- RLS is mandatory, not optional. Any data-access change must preserve tenant
  isolation.
- Always think through "user A cannot read organization B data" before shipping
  a feature.
- Keep permission checks, billing limits, AI execution limits, and business
  rules server-side in route handlers, server actions, domain services, or
  database policies. React components should not own those rules.
- Keep AI provider/model selection behind small abstractions or environment
  configuration. Do not hard-code provider assumptions in UI components.
- Billing limits must be checked server-side before AI calls, document
  ingestion, or automation execution.
- Prefer small PR-sized changes matching `docs/codex-backlog.md`.

## Implementation Order

Follow this sequence unless the user explicitly asks otherwise:

1. Supabase Auth and organization bootstrap.
2. Assistants CRUD.
3. Chat persistence and streaming UI.
4. Knowledge base ingestion.
5. RAG answering with sources.
6. Manual automation templates.
7. Billing and limits.

When selecting the next task, prefer completing acceptance criteria for the
earliest unfinished backlog item over starting later roadmap work.

## Domain Contracts

The initial migration already defines the core model:

- `organizations`, `organization_members`, roles `owner`, `admin`, `member`.
- `plans`, `subscriptions`, and organization-level limits.
- `assistants` with name, description, area, instructions, model, temperature,
  default flag, and creator.
- `conversations` and `messages` scoped to organizations.
- `knowledge_bases`, `documents`, and `document_chunks` with pgvector
  embeddings.
- `automations` and `automation_runs`.
- `integrations`.
- `usage_events`.

Use the migration as the source of truth until generated Supabase types are
available. If TypeScript database types are expanded, keep them aligned with
the migration.

## UI And UX Direction

- For UI work, use the repo-local skill at
  `.codex/skills/bem-hub-frontend-design/SKILL.md`. If the external
  `frontend-design` skill/plugin is also available, use it together with the
  repo-local skill, with the BEM HUB skill taking precedence for local product
  language and tokens.
- Treat the current visual target as an "AI Operating System" for business
  operations: dark, focused, technical, calm, and dense enough for daily use.
- Preserve the dark green system defined in `src/app/globals.css` and
  documented in `docs/design-system.md`.
- The product should feel like an operational SaaS tool, not a generic
  marketing template.
- Favor dense, clear, work-focused interfaces for repeated daily use.
- Keep Portuguese UI copy by default.
- Use existing local primitives (`Button`, `Card`, `Badge`) and established
  Tailwind tokens from `src/app/globals.css`.
- Use `lucide-react` icons for recognizable actions.
- Use green as an operational signal for primary actions, active agents,
  healthy states, and live processing. Use muted gray for idle/pending and
  danger red only for destructive/risk states.
- Prefer app-shell patterns already established in `/app`: fixed sidebar,
  compact topbar, searchable command area, low-contrast cards, icon tiles, and
  explicit status indicators.
- Avoid decorative complexity that does not improve the workflow. Subtle grid
  or glow effects are allowed only when they support the operating-system feel.
- Do not build advanced landing-page polish before the workspace workflows
  needed for the MVP.

## Coding Practices

- Use TypeScript strictly and keep types close to domain boundaries.
- Validate external input with Zod in route handlers/actions.
- Prefer server components by default; add client components only for actual
  interactivity.
- Reuse existing folders and naming conventions before adding new structure.
- Keep changes scoped and avoid broad refactors unrelated to the task.
- Use environment variables for secrets and configurable model choices.
- Do not require Supabase/OpenAI credentials for `npm run build`; features that
  need real credentials should fail gracefully at runtime.
- Prefer Bun commands when running local scripts because this repo now has
  `bun.lock`. Keep `package-lock.json` unless the user explicitly asks to remove
  npm support.

## Verification

For meaningful code changes, run:

- `bun run lint`
- `bun run build`

For auth, RLS, and organization-scoped features, also manually verify with two
Supabase users when credentials are available. State clearly when credentials
are missing and which manual checks remain.

## Known Constraints

- The app can build without Supabase/OpenAI credentials.
- `/api/chat` requires `OPENAI_API_KEY` for a real streamed answer.
- `OPENAI_CHAT_MODEL` should remain configurable.
- `src/proxy.ts` should be added only when Supabase session refresh is wired.
- Advanced integrations, WhatsApp, autonomous agents, marketplace, white-label,
  recurring scheduled automations, and granular permission matrices are out of
  scope for the MVP.
