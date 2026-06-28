# Technical Architecture

## Stack

- Next.js App Router, React, TypeScript.
- Tailwind CSS and shadcn-style local components.
- Supabase Auth, PostgreSQL, Storage, RLS, pgvector.
- Vercel AI SDK with OpenAI, Anthropic, and Google provider adapters.
- TanStack Query for server state.
- Zustand for small local UI state.
- React Hook Form and Zod for forms.

## Principles

- Multi-tenant from the first migration.
- Every business table uses `organization_id`.
- RLS is mandatory, not optional.
- React components must not contain business rules that belong in domain services or route handlers.
- AI provider selection is behind a server-side runtime abstraction. Assistants
  store `provider`, `provider_connection_id`, and `model`; route handlers
  resolve the encrypted organization connection before calling a provider.
- Billing limits are checked server-side before AI or automation execution.

## Initial App Boundaries

- `src/app`: routing, pages, route handlers.
- `src/components`: shared presentational components.
- `src/features`: product domains such as assistants, billing, organizations.
- `src/lib`: infrastructure helpers for Supabase, AI, utilities.
- `supabase/migrations`: database schema and policies.
- `docs`: product and delivery context for Codex tasks.

## AI Provider Runtime

Workspace admins manage AI keys in `/app/settings/ai-providers`. Keys are
encrypted server-side with `APP_ENCRYPTION_KEY` before persistence. The UI only
receives metadata such as provider, status, key hint, default model, and model
options.

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GOOGLE_GENERATIVE_AI_API_KEY` remain
development/legacy fallbacks only for assistants without a saved provider
connection. Production should prefer organization-scoped provider connections.
