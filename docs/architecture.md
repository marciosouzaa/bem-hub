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
- External channels and commerce platforms must be isolated behind domain
  adapters. Webhooks, provider payloads, and vendor IDs must not become the
  internal conversation or customer model.
- Scheduled jobs must be idempotent, organization-scoped, observable, and
  checked against server-side entitlements before execution.
- Source metadata used by RAG must be persisted with assistant messages so a
  reloaded conversation preserves the evidence shown at answer time.
- Manual automations use static, typed templates and the organization default
  assistant runtime. Inputs are untrusted data, runs persist status and output,
  and no template sends data to an external customer channel.

## Initial App Boundaries

- `src/app`: routing, pages, route handlers.
- `src/components`: shared presentational components.
- `src/features`: product domains such as assistants, billing, organizations.
- `src/lib`: infrastructure helpers for Supabase, AI, utilities.
- `supabase/migrations`: database schema and policies.
- `docs`: product and delivery context for Codex tasks.

## Delivery Sources Of Truth

- `docs/roadmap.md`: ordered product milestones and decision gates.
- `docs/codex-backlog.md`: current executable queue and discoveries.
- `docs/principles.md`: engineering and decision rules.
- `docs/worklog.md`: latest operational checkpoint and next step.
- `docs/handoff.md`: broader historical state and manual verification record.

When a presentation or old handoff conflicts with the repository, verify the
implementation and update the documents instead of assuming a feature is ready.

## Pilot Extension Boundaries

The core MVP remains a multi-tenant AI workspace. The cosmetics pilot adds a
vertical sequence after the internal assistant proves value:

1. RAG-backed internal catalog assistant.
2. Provider-neutral assisted messaging channel.
3. Commerce data adapter and scheduled business routines.

WhatsApp providers such as Evolution API or Z-API must implement a channel
contract owned by BEM HUB. Commerce providers such as Nuvemshop or Shopify must
map into normalized product, stock, order, and customer contracts. Provider
selection, credentials, automatic external sends, and personal-data policies
are product or operational gates, not implementation details.

## Privileged Database Functions

RLS membership lookups live as `SECURITY DEFINER` functions in the unexposed
`private` schema because querying `organization_members` through its own policy
would recurse. Public `is_org_member` and `is_org_admin` functions are
`SECURITY INVOKER` wrappers available only to `authenticated`.

`match_document_chunks` is `SECURITY INVOKER`, relies on table RLS in addition
to the explicit organization check, and caps results server-side. The exposed
`bootstrap_owned_organization` RPC remains `SECURITY DEFINER` because it must
create the first membership, but it validates `auth.uid()` against the
organization owner and is executable only by `authenticated`.

## AI Provider Runtime

Workspace admins manage AI keys in `/app/settings/ai-providers`. Keys are
encrypted server-side with `APP_ENCRYPTION_KEY` before persistence. The UI only
receives metadata such as provider, status, key hint, default model, and model
options.

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GOOGLE_GENERATIVE_AI_API_KEY` remain
development/legacy fallbacks only for assistants without a saved provider
connection. Production should prefer organization-scoped provider connections.

## Manual Automations

`/app/automations` exposes only on-demand templates: summary, client reply
draft, and checklist. Execution checks the `automations` entitlement on the
server, resolves the default assistant runtime, persists `automation_runs`, and
records `automation.completed` usage.

Runs are scoped by `organization_id`. Members may create runs and update only
runs they created; organization members may inspect history under RLS.
Scheduling, automatic sends, external side effects, and autonomous execution
remain out of scope.

## Assisted Channel Contract

Provider-neutral contracts live in `src/features/channels`. Inbound messages
require stable provider IDs for idempotency. Replies begin as drafts and cannot
reach `sent` without explicit `approved`; terminal states stay immutable. No
adapter sends externally before BSP selection and operational approval.

`/app/channels` owns CRUD, numero, modalidade e metodo de autenticacao QR/PIN.
`/app/support` owns only the attendance inbox and conversation detail. Channel
configuration must never be embedded in the attendance workflow.

Each channel connection represents one independent number and declares
`official` or `unofficial`. Connections never share credentials, provider IDs
or webhook state. Choosing an unofficial adapter is an explicit organization
decision; disabling it must not affect official numbers or stored attendance.

Normalized commerce contracts live in `src/features/commerce`. Money uses
integer cents, stock uses non-negative integers, external IDs stay strings and
orders use ISO timestamps. Spreadsheet import maps provider columns into these
contracts before any future connector persists data.

## Support Realtime Consistency

Webhook processing and realtime delivery are separate responsibilities. The
provider callback is verified, normalized and persisted before any interface
notification exists. PostgreSQL remains the source of truth.

Support changes publish a private Supabase Broadcast event after commit:

- topic: `org:<organization_id>:support`;
- event: `support.inbox.changed`;
- payload: organization, conversation, entity and operation IDs only;
- authorization: active organization membership through RLS on
  `realtime.messages`;
- consumers: the `/app/support` route segment, never provider-specific UI.

The event is an invalidation signal, not a copy of the conversation. Clients
debounce nearby events and reconcile through the existing tenant-scoped support
RPCs. A successful subscription, reconnection, browser focus or visibility
recovery also triggers reconciliation, closing gaps where an event could have
arrived while the client was offline.

No message content, phone number, credential or raw provider payload is sent
through Broadcast. Clients have read permission only; database triggers are the
sole publishers. Duplicate and out-of-order notifications must remain harmless.
