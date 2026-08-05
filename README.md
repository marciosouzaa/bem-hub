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
bun install
cp .env.example .env.local
bun run dev
```

Open `http://localhost:3000`.

The app builds without Supabase/OpenAI credentials, but `/api/chat` requires `OPENAI_API_KEY` to return a real streamed answer.

## Environment

Copy `.env.example` to `.env.local` and fill the Supabase project URL and
publishable key:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported only as a legacy fallback for old
local environments. OpenAI can stay empty until chat streaming is tested.

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

## Deployment

Use [docs/deployment-vercel.md](docs/deployment-vercel.md) for the Vercel
production checklist, including Bun, Node.js version, Supabase publishable key,
Auth redirect URLs, and post-deploy checks.

## Licença

O código deste repositório é disponibilizado sob a
[PolyForm Noncommercial License 1.0.0](LICENSE). Ela permite uso,
modificação e distribuição apenas para finalidades não comerciais.

O BEM HUB não é software open source. Uso comercial, oferta de serviço, ou
qualquer outra exploração comercial do código requer uma licença comercial
separada e autorização prévia do titular dos direitos autorais, Marcio Souza.