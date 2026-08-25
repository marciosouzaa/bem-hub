# Atendimento Current Flow Inventory

Task: `1.1 Map current Atendimento flows against specs`.

## Scope Mapped

This inventory maps current code behavior against:

- `support/message-operations`
- `support/inbox-parity`
- `support/department-routing`

It covers inbox, thread, composer, message menu, media viewer, downloads, retry,
read receipts, Realtime and channel adapters.

## Inbox

Current files:

- `src/features/support/support-inbox-shell.tsx`
- `src/features/support/support-inbox-item.tsx`
- `src/features/support/support-inbox-filters.ts`
- `src/features/support/queries.ts`

Current behavior:

- Inbox is master-detail, fixed width on desktop and responsive on mobile.
- Views exist: `Abertas`, `Atendidas`, `Minhas`, optional `Grupos`,
  `Encerradas`.
- Local filters exist for search, channel, assignee, tag, group toggle and
  sort.
- Sort supports `recent`, `oldest` and `unread`.
- Cards show `unreadCount` badge, channel status, contact avatar, tag, assignee
  and priority signal.
- `Departamento` select exists but is disabled.
- `Grupos` view is intentionally hidden until group toggle is enabled.

Mapped spec status:

- `Unread filters and cards`: partial. Cards and unread sort exist; dedicated
  unread-only filter does not exist.
- `Unread state per operator`: partial. `mark_support_conversation_read` exists,
  but operator-specific manual unread/pin model is not present in current UI.
- `Pin conversations`: missing.
- `Mark conversation unread`: missing.
- `Audible notifications`: missing.
- `Department-aware inbox`: placeholder only through disabled department select.

## Conversation Header And Actions

Current files:

- `src/features/support/support-conversation-view.tsx`
- `src/features/support/support-conversation-actions.tsx`
- `src/features/support/support-actions.ts`
- `src/features/support/support-operation-schema.ts`

Current behavior:

- Header shows contact avatar, channel name, channel status, phone, status badge
  and assignee badge.
- Operators can take unassigned conversations.
- Admin or assigned operator can set status to open, pending, escalated,
  resolved, release conversation, reopen and set priority.
- Server action calls `manage_support_conversation` with expected version.
- Opening a conversation mounts `SupportReadReceipt`.

Mapped spec status:

- Existing operational lifecycle is implemented for assignee/status/priority.
- Department transfer is missing.
- Pin/unpin and mark unread are missing.

## Thread

Current files:

- `src/features/support/support-message-thread.tsx`
- `src/features/support/support-message-delivery-status.tsx`
- `src/features/support/support-reply-preview.tsx`
- `src/features/support/support-reply-preview-details.ts`

Current behavior:

- Messages render as inbound/outbound bubbles.
- Reply preview renders above message body when `replyTo` exists.
- Attachments render before caption/body.
- Image/video have compact previews and open media viewer.
- Audio uses `SupportAudioPlayer`.
- Documents render file-name fallback with size and open viewer.
- Outbound failed messages show `Tentar novamente` when caller can retry.
- Delivery state is shown separately from message status.

Mapped spec status:

- `Reply parity`: partial. Outbound reply UI exists. Inbound reply depends on
  provider payload resolving `reply_to_message_id`.
- `Media lifecycle`: partial to implemented locally. Preview/viewer/download
  exist; provider smoke still pending.
- `Reactions`: missing in thread rendering.
- `Message edit and delete policy`: missing in thread behavior.

## Composer

Current files:

- `src/features/support/support-message-composer.tsx`
- `src/app/api/support/messages/route.ts`
- `src/app/api/support/media/route.ts`
- `src/features/support/send-support-message.ts`
- `src/features/support/send-support-media.ts`
- `src/features/support/support-message-contracts.ts`

Current behavior:

- Text composer supports Enter to send and Shift+Enter newline.
- Text send is optimistic; request uses `/api/support/messages`.
- Reply context can be selected and cancelled before send.
- Composer blocks send when conversation is resolved, channel disconnected or
  viewer cannot respond.
- Media flow supports multi-file modal, add-more behavior, per-file caption and
  selected preview.
- Media prepare step creates message and signed upload target.
- Browser uploads directly to Supabase Storage signed URL.
- Deliver step inserts attachment and sends provider message.
- Fail step marks prepared media failed and removes storage object when path is
  valid.
- Accepted media: jpeg, png, webp, mp4, mpeg/mp4/ogg audio, pdf, txt, csv, docx.
- Max media size is 25 MB.

Mapped spec status:

- `Media lifecycle`: mostly implemented locally for outbound.
- `Audio recording`: missing. Audio file upload exists, microphone recording UI
  does not.
- `Message action availability`: composer respects channel/status/assignee
  capability, but message-level edit/delete/reaction capability is missing.

## Message Menu

Current files:

- `src/features/support/support-message-actions.tsx`

Current behavior:

- Menu appears on message bubble.
- Enabled actions:
  - `Responder` when `message.canReply`.
  - `Copiar` when text exists and it is not synthetic media fallback.
  - `Baixar` when available attachments exist.
- Disabled actions:
  - `Editar`
  - `Excluir`

Mapped spec status:

- `Message action availability`: partial. Safe existing actions are present.
  Disabled placeholders need explicit capability-aware states.
- `Message edit and delete policy`: missing.
- `Reactions`: missing.

## Media Viewer And Downloads

Current files:

- `src/features/support/support-media-viewer.tsx`
- `src/features/support/support-attachment-download.ts`
- `src/app/api/support/attachments/[attachmentId]/route.ts`

Current behavior:

- Viewer supports image zoom, video controls, audio player, document open,
  carousel and thumbnails.
- Download tries authenticated fetch, converts to blob and saves locally.
- Fallback opens authenticated route in new tab.
- Attachment route authenticates user, resolves workspace, filters attachment by
  `organization_id` and generates short signed URL.

Mapped spec status:

- `Cross-tenant media access is denied`: implemented by route filter on
  `organization_id`; still needs task-specific tests/smoke matrix.
- `Media lifecycle`: viewer and download path exist.

## Read Receipts

Current files:

- `src/features/support/support-read-receipt.tsx`
- `src/features/support/support-actions.ts`
- migrations around support operational lifecycle/read state.

Current behavior:

- Opening conversation calls `markSupportConversationReadAction`.
- Server action validates UUID, resolves workspace, calls
  `mark_support_conversation_read`, then revalidates `/app/support`.

Mapped spec status:

- `Operator opens conversation`: partially covered.
- Manual unread and pinned operator state not present.
- Provider delivery/read receipt remains separate from operator read action.

## Realtime

Current files:

- `src/features/support/support-realtime-listener.tsx`
- `src/features/support/realtime.ts`
- broadcast migrations in Supabase history.

Current behavior:

- Private Realtime topic is `org:<organizationId>:support`.
- Listener subscribes to `support.inbox.changed`.
- It schedules debounced `router.refresh`.
- Window focus and visibility change also reconcile from canonical server data.
- If Supabase browser config/auth fails, Atendimento still loads.

Mapped spec status:

- Inbox refresh works as invalidation, not payload transport.
- Sound notification eligibility is not implemented; current event lacks enough
  typed payload for sound rules.

## Channel Adapters

Current files:

- `src/features/channels/providers/channel-provider-adapter.ts`
- `src/features/channels/providers/wuzapi/wuzapi-adapter.ts`
- `src/features/channels/providers/evolution/evolution-adapter.ts`
- `src/features/channels/providers/wuzapi/wuzapi-webhook.ts`
- `src/features/channels/providers/evolution/evolution-webhook.ts`
- `src/features/channels/webhooks/contracts.ts`

Current behavior:

- Provider-neutral contract supports health, pairing, webhook configure/health,
  send text, send media, send reaction, webhook normalization, media download
  and contact avatar lookup.
- Wuzapi:
  - Configures HMAC and events `Message`, `ReadReceipt`.
  - Sends text, media, reaction and quoted context using `ContextInfo`.
  - Webhook verifies `x-hmac-signature`.
  - Normalizes inbound, phone-originated outbound, receipts, media Base64 and
    quoted stanza when present.
  - Ignores groups, remote unsupported JIDs, protocol-only messages and empty
    non-media sync payloads.
- Evolution:
  - Configures `MESSAGES_UPSERT` and `MESSAGES_UPDATE`.
  - Sends text, media and reaction.
  - Uses pure Base64 for media send.
  - Downloads inbound media server-side via provider API when webhook has media
    envelope.
  - Verifies instance and BEM HUB webhook secret.
  - Normalizes inbound, phone-originated outbound, delivery updates, media and
    quoted stanza when present.
  - Ignores groups, newsletters, status broadcast, protocol-only messages and
    unsupported remote JIDs.

Mapped spec status:

- `Provider validation matrix`: not yet captured in separate matrix.
- `Reply parity`: adapter code searches quoted IDs, but real smoke still showed
  missing inbound reference.
- `Reactions`: adapter send contract exists; persistence/rendering/webhook
  reaction normalization are not complete.
- `Edit/delete remote`: no provider-neutral contract currently present.

## Department Routing

Current files/placeholders:

- `src/features/support/support-inbox-shell.tsx` has disabled department filter.
- No current `support_departments` model found in support schemas.
- No current `department_id` in `SupportInboxItem` or `SupportConversation`.
- No channel default department in current channel schemas seen during inventory.

Mapped spec status:

- `Department registry`: missing.
- `Every support conversation has department`: missing.
- `Channel default department`: missing.
- `Department assignment and transfer`: missing.
- `Department assistant default`: missing.

## Immediate Gaps

- Dedicated unread-only filter.
- Per-operator pin and manual unread.
- Sound notification rules and preference.
- Department schema, routing, transfer and assistant default.
- Capability-aware menu for edit/delete/reaction.
- Local audited edit/delete.
- Reaction persistence/rendering/webhook normalization.
- Microphone audio recording flow.
- Real provider fixtures for reply inbound/reactions/messages update.
- End-to-end smoke matrix for Wuzapi and Evolution.
