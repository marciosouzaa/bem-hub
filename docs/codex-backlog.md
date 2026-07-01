# Codex Backlog

Each task should be implemented in a small PR-sized change with acceptance criteria and verification.

## 1. Supabase Auth and Organization Bootstrap

Status: implemented as the initial foundation. Keep hardening RLS and manual
two-user verification on the follow-up list.

Scope:
- Add login, signup, logout screens.
- Create organization after first signup.
- Store user membership.
- Add server checks for authenticated routes.
- Wire `src/proxy.ts` for Supabase SSR session refresh.

Likely files:
- `src/app/auth/*`
- `src/app/app/*`
- `src/lib/supabase/*`
- `supabase/migrations/*`

Acceptance:
- User can sign up, log in, create organization, and access the workspace.
- User A cannot read organization B data.
- Owner can invite or add a member placeholder.
- Supabase SSR auth refresh runs through `src/proxy.ts`.

Verification:
- `bun run lint`
- `bun run build`
- Manual test with two Supabase users.

## 2. Assistants CRUD

Status: implemented.

Scope:
- List assistants.
- Create, edit, delete assistant.
- Set default assistant.
- Validate inputs with Zod.

Acceptance:
- Assistants are scoped by organization.
- Member can use assistants; owner/admin can manage them.

Verification:
- `bun run lint`
- `bun run build`
- Production smoke test on Vercel.

## 3. Chat Persistence and Streaming

Status: implemented as the first functional version. Keep manual QA and UX
polish on the follow-up list.

Scope:
- Persist conversations and messages.
- Connect UI to `/api/chat`.
- Save model and usage metadata.
- Support assistant instructions.

Acceptance:
- User creates a conversation and receives streamed response.
- Reloading the page keeps history.
- Usage event is written after response.

Verification:
- `bun run lint`
- `bun run build`
- Manual smoke test reported working once, but should be repeated after AI
  provider connections.

## 3.5 AI Provider Connections

Status: implemented as account-managed provider connections.

Scope:
- Store provider API keys per organization.
- Encrypt keys server-side.
- Support OpenAI, Claude/Anthropic, and Gemini.
- Let assistants choose provider, connection, and model.
- Keep legacy env var fallback for local development.

Acceptance:
- Owner/admin can create provider connections.
- Assistants can be configured with provider-specific model choices.
- `/api/chat` resolves the assistant runtime from the selected connection.
- Secrets never return to the client.

Verification:
- `bun run lint`
- `bun run build`
- Supabase migration `0006_ai_provider_connections` applied remotely.
- Manual end-to-end test still pending after the remote migration.

## 4. Knowledge Base Ingestion

Status: implemented as the first ingestion slice for TXT/Markdown. PDF and
DOCX are accepted by the upload UI but currently recorded as failed with a
clear extraction message until parsers are added.

Scope:
- Upload files to Supabase Storage.
- Extract text by MIME type.
- Chunk document text.
- Generate embeddings.
- Store `document_chunks`.
- Add similarity search RPC.

Acceptance:
- Ready documents can be searched semantically.
- Failed documents show error status.

Current implementation:
- `/app/knowledge` lists organization-scoped documents, status, chunks and
  semantic search results.
- `/api/knowledge/documents` accepts multipart uploads, validates admin role,
  plan feature and document limit server-side.
- Files are stored in private Supabase Storage bucket `knowledge-documents`.
- TXT and Markdown are extracted, chunked, embedded with OpenAI
  `text-embedding-3-small`, and stored in `document_chunks`.
- Uploads use a 6 MB synchronous processing limit.
- `documents` stores file size, chunk count, embedding model and processed
  timestamp metadata.

Verification:
- `bun run lint`
- `bun run build`

Remaining:
- Manual upload/search smoke test against Supabase Storage and a real OpenAI
  key.
- Add PDF and DOCX extraction parsers.
- Repeat two-user tenant isolation test for documents and storage objects.

## 5. RAG Answering

Scope:
- Retrieve top chunks before chat completion.
- Inject context into the prompt.
- Return sources to UI.

Acceptance:
- Answers cite document names.
- Assistant can say when context is insufficient.

## 6. Manual Automation Templates

Scope:
- Implement templates as typed configs.
- Add input form per template.
- Execute via AI route handler.
- Persist `automation_runs`.

Acceptance:
- User runs each MVP template and sees output history.

## 7. Billing and Limits

Status: partially implemented. Entitlements are active server-side and the
temporary manual plan switcher exists in settings.

Scope:
- Seed plans.
- Associate organization with subscription.
- Enforce limits for users, assistants, documents, and monthly messages.

Acceptance:
- Free plan blocks over-limit actions.
- Upgrade screen explains the required plan.
- Owner/admin can switch plans manually during product construction.

Current implementation:
- `getEntitlements` reads `subscriptions` and `plans`.
- Chat and assistants enforce feature/limit checks server-side.
- `/app/settings/billing` lets owner/admin switch plans manually with status
  `manual`.
- `/app/upgrade` redirects to `/app/settings/billing`.

Remaining:
- Real checkout/gateway.
- Billing history/invoices.
- Full admin-only account billing rules and audit trail.
