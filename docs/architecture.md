# Technical Architecture

## Stack

- Next.js App Router, React, TypeScript.
- Tailwind CSS and shadcn-style local components.
- Supabase Auth, PostgreSQL, Storage, RLS, pgvector.
- Vercel AI SDK with OpenAI provider first.
- TanStack Query for server state.
- Zustand for small local UI state.
- React Hook Form and Zod for forms.

## Principles

- Multi-tenant from the first migration.
- Every business table uses `organization_id`.
- RLS is mandatory, not optional.
- React components must not contain business rules that belong in domain services or route handlers.
- AI provider selection is behind a small abstraction so Anthropic, Gemini, or open-source models can be added later.
- Billing limits are checked server-side before AI or automation execution.

## Initial App Boundaries

- `src/app`: routing, pages, route handlers.
- `src/components`: shared presentational components.
- `src/features`: product domains such as assistants, billing, organizations.
- `src/lib`: infrastructure helpers for Supabase, AI, utilities.
- `supabase/migrations`: database schema and policies.
- `docs`: product and delivery context for Codex tasks.

## OpenAI Notes

The current OpenAI docs identify `gpt-5.5` as the latest model family. The app keeps `OPENAI_CHAT_MODEL` configurable so production can change models without code changes.
