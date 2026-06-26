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
- Add `src/proxy.ts` only when Supabase session refresh is wired.

Likely files:
- `src/app/auth/*`
- `src/app/app/*`
- `src/lib/supabase/*`
- `supabase/migrations/*`

Acceptance:
- User can sign up, log in, create organization, and access the workspace.
- User A cannot read organization B data.
- Owner can invite or add a member placeholder.

Verification:
- `bun run lint`
- `bun run build`
- Manual test with two Supabase users.

## 2. Assistants CRUD

Status: next recommended implementation step.

Scope:
- List assistants.
- Create, edit, delete assistant.
- Set default assistant.
- Validate inputs with Zod.

Acceptance:
- Assistants are scoped by organization.
- Member can use assistants; owner/admin can manage them.

## 3. Chat Persistence and Streaming

Scope:
- Persist conversations and messages.
- Connect UI to `/api/chat`.
- Save model and usage metadata.
- Support assistant instructions.

Acceptance:
- User creates a conversation and receives streamed response.
- Reloading the page keeps history.
- Usage event is written after response.

## 4. Knowledge Base Ingestion

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

Scope:
- Seed plans.
- Associate organization with subscription.
- Enforce limits for users, assistants, documents, and monthly messages.

Acceptance:
- Free plan blocks over-limit actions.
- Upgrade screen explains the required plan.
