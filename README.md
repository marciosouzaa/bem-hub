# BEM HUB

SaaS de IA corporativa para PMEs brasileiras. O MVP combina workspace multiempresa, assistentes por area, chat com IA, base de conhecimento, automacoes manuais, uso/auditoria e billing por plano.

## Stack

- Next.js App Router, React, TypeScript.
- Tailwind CSS and shadcn-style local components.
- Supabase Auth, PostgreSQL, Storage, RLS, pgvector.
- Vercel AI SDK with OpenAI provider first.
- Zod, React Hook Form, TanStack Query, Zustand.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The app builds without Supabase/OpenAI credentials, but `/api/chat` requires `OPENAI_API_KEY` to return a real streamed answer.

## Project Structure

```txt
src/app              Routes, pages, route handlers
src/components       Shared UI and marketing preview
src/features         Product domains
src/lib              Infrastructure helpers
src/types            Shared TypeScript types
supabase/migrations  Database schema and RLS policies
docs                 Product, roadmap, risks, backlog
```

## First Implementation Tasks

1. Supabase Auth and organization bootstrap.
2. Assistants CRUD.
3. Chat persistence and streaming UI.
4. Knowledge base ingestion.
5. RAG answering with sources.
6. Manual automation templates.
7. Billing limits and subscription state.

See [docs/codex-backlog.md](docs/codex-backlog.md) for task-level scope, acceptance criteria, and verification.
