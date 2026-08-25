# Operator Conversation State Design

Task: `2.1 Design tenant-scoped persistence for per-operator read state, manual unread state and pinned conversations without changing provider delivery/read receipts`.

## Current Base

Existing table:

- `public.support_conversation_reads`

Current columns:

- `organization_id`
- `conversation_id`
- `user_id`
- `last_read_message_id`
- `read_at`

Current key/security shape:

- Primary key: `(organization_id, conversation_id, user_id)`.
- Composite FK to `support_conversations(organization_id, id)`.
- Composite FK to `support_messages(organization_id, conversation_id, id)` for
  `last_read_message_id`.
- RLS enabled.
- Authenticated users have `select` only.
- Select policy allows only own row and active org membership.
- Writes happen through RPC, not direct browser table mutation.

This table is already tenant-scoped and per-operator. It should become the
logical operator conversation state row for inbox read/unread/pin behavior.

## Decision

Extend `support_conversation_reads` instead of creating a new
`support_conversation_operator_states` table in the first implementation slice.

Why:

- Existing PK already matches required identity: org + conversation + user.
- Existing RLS already models own-user visibility.
- Existing inbox query already joins this table for current user.
- Avoids duplicate row lifecycle and migration backfill.
- Keeps provider delivery/read receipts separate from operator UI state.

Trade-off:

- Table name remains read-specific even though it will also store pin/manual
  unread. Acceptable for this slice; code should call it "operator state" at
  domain boundary to avoid leaking DB naming into UI.

## Proposed Columns

Add:

```sql
alter table public.support_conversation_reads
  add column if not exists marked_unread_at timestamptz,
  add column if not exists pinned_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();
```

Semantics:

- `read_at`: latest operator read marker. Opening a conversation updates it.
- `last_read_message_id`: latest message visible when read marker was set.
- `marked_unread_at`: manual unread marker. Null means no manual unread.
- `pinned_at`: per-operator pin marker. Null means not pinned.
- `updated_at`: operator-state update marker for diagnostics and ordering if
  needed.

Manual unread computation:

- Natural unread count remains inbound messages where `message.created_at >
  read_at` or no read row exists.
- If `marked_unread_at is not null`, inbox should expose unread state even when
  natural unread count is zero.
- Proposed `unreadCount`:
  - natural inbound unread count when natural count > 0;
  - `1` when manual unread is set and natural count is zero;
  - `0` otherwise.
- Opening/marking read clears `marked_unread_at`.
- Sending outbound messages does not clear manual unread unless user opens or
  explicitly marks read.

Pinned computation:

- `isPinned = pinned_at is not null`.
- `pinnedAt = pinned_at`.
- Pin/unpin never changes read count, provider delivery status or conversation
  assignment.

## RPC Changes

Keep direct grants minimal. Add/update RPCs:

- Update `private.mark_support_conversation_read`:
  - preserve `pinned_at`;
  - clear `marked_unread_at`;
  - update `updated_at`.
- Add `private.mark_support_conversation_unread(target_organization_id uuid, target_conversation_id uuid)`.
  - validates `auth.uid()`;
  - validates active org membership;
  - validates conversation belongs to org;
  - upserts state row with `marked_unread_at = now()`;
  - preserves `pinned_at`, `last_read_message_id`, `read_at`.
- Add `private.set_support_conversation_pinned(target_organization_id uuid, target_conversation_id uuid, pinned boolean)`.
  - same validation;
  - upserts state row;
  - sets `pinned_at = now()` when true;
  - sets `pinned_at = null` when false;
  - does not alter read fields.
- Public wrappers stay `security invoker`, call private functions and grant
  execute only to `authenticated`.

## Query Changes

Update `public.get_support_inbox_operational` to return:

- `unreadCount`
- `isPinned`
- `pinnedAt`
- `markedUnreadAt`

Keep current `unreadCount` contract nonnegative integer.

Inbox ordering implementation should happen in task `2.4`, not in SQL yet,
unless performance evidence later requires server-side ordering.

## RLS And Grants

No direct browser writes to `support_conversation_reads`.

Keep:

```sql
revoke all on table public.support_conversation_reads from anon, authenticated;
grant select on table public.support_conversation_reads to authenticated;
```

Keep/adjust select policy:

- `user_id = (select auth.uid())`
- `public.is_org_member(organization_id)`

No insert/update/delete grants to `authenticated`; mutations go through RPCs
with explicit membership and conversation checks.

If a future implementation creates a new public table instead of extending this
one, migration must include explicit `GRANT` statements because Supabase is
moving public-schema Data API exposure to opt-in for new tables.

## Indexes

Existing useful indexes:

- PK `(organization_id, conversation_id, user_id)` supports current inbox join.
- `support_conversation_reads_org_user_idx` supports user-scoped state reads.
- FK indexes exist for `last_read_message_id` and `user_id`.

Add:

```sql
create index if not exists support_conversation_reads_org_user_pinned_idx
  on public.support_conversation_reads(organization_id, user_id, pinned_at desc)
  where pinned_at is not null;
```

Do not add an unread index yet. Natural unread count is driven by
`support_messages` per conversation and the existing inbox query already does a
lateral count. Revisit only after query plan or load evidence.

## Realtime

Do not modify objects in the `realtime` schema. Supabase breaking-change
changelog says the schema is locked down; existing policy on
`realtime.messages` remains acceptable.

For pin/unread actions:

- initiating action calls `revalidatePath`;
- other tabs reconcile on focus/visibility through existing listener behavior.

For inbound messages:

- existing `support_messages` trigger continues to broadcast org-level inbox
  invalidation.

If cross-tab instant pin/unread becomes required, add a trigger on
`public.support_conversation_reads` that calls existing
`private.broadcast_support_change` without changing `realtime` schema. Do not
add that until UX requires it, because operator-only state would refresh all org
members.

## Verification Plan For Task 2.2

- Migration applies locally/remote-linked without recreating existing functions
  from stale definitions.
- Existing read behavior still clears unread count on open.
- Mark unread creates unread badge without creating a fake message.
- Pin/unpin does not alter `delivery_status`, `read_at` from provider receipts
  or `support_message_delivery_states`.
- User A cannot read or mutate user B's operator state.
- Organization A cannot reference conversation from organization B.
- Advisors show no missing FK index introduced by this slice.
