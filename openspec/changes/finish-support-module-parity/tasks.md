## 1. Inventory And Validation Matrix

- [x] 1.1 Map current Atendimento flows against specs: inbox, thread, composer, menu, media viewer, downloads, retry, read receipts, Realtime and channel adapters.
- [x] 1.2 Create a provider capability matrix for Wuzapi and Evolution covering text, media, reply inbound/outbound, reactions, edit, delete, delivery, read and webhook drift.
- [x] 1.3 Add or update focused tests for existing safe actions: reply, copy, download, media preview, authenticated download and failed media state.
- [x] 1.4 Run current gates and record baseline: `bun run test:whatsapp-contracts`, focused support tests, `bun run lint`, `bun run build`.

## 2. Inbox Parity

- [x] 2.1 Design tenant-scoped persistence for per-operator read state, manual unread state and pinned conversations without changing provider delivery/read receipts.
- [x] 2.2 Add migration, RLS and indexes for operator conversation state; include cross-tenant denial tests or transactional probes.
- [x] 2.3 Update support inbox queries/RPCs and Zod schemas to return unread count, pinned state and department-ready fields without breaking current cards.
- [x] 2.4 Implement unread-only filter and sorting where pinned conversations stay above normal rows inside active filters.
- [x] 2.5 Add conversation actions for pin/unpin and mark as unread, using server-side validation and optimistic UI only when reversible.
- [x] 2.6 Add sound notification controller with user/browser preference, no sound for own messages, sync/protocol events, historical imports or conversations assigned to another user.
- [x] 2.7 Cover inbox filtering, pinning, mark-unread and notification eligibility with unit tests.

## 3. Department Routing

- [x] 3.1 Add `support_departments` migration with `organization_id`, active/archive state, optional default assistant and admin-only management rules.
- [ ] 3.2 Add `default_department_id` to channel configuration and `department_id` to support conversations with safe backfill for existing rows.
- [ ] 3.3 Update inbound conversation creation and manual start flow so new conversations inherit channel default department when active.
- [ ] 3.4 Add pending-routing state or explicit admin-visible fallback for channels without active default department; do not send automatic responses.
- [ ] 3.5 Add department transfer action with audit event and server-side tenant validation.
- [ ] 3.6 Expose department filter, department badge/context and default assistant reference in Atendimento UI using BEM HUB design patterns.
- [ ] 3.7 Add tests for admin/member permissions, cross-tenant rejection, channel default routing and department transfer events.

## 4. Message Operations

- [ ] 4.1 Replace disabled edit/delete menu placeholders with explicit capability-aware UI: available, local-only, provider-unsupported or pending-contract.
- [ ] 4.2 Implement local audited delete/hide policy for messages without physically removing tenant audit data.
- [ ] 4.3 Implement audited local edit policy for eligible outbound messages, preserving previous content, editor and timestamp.
- [ ] 4.4 Implement reaction persistence and rendering for inbound reactions with idempotent target resolution.
- [ ] 4.5 Implement outbound reaction only for providers confirmed in capability matrix; otherwise keep UI unavailable with clear state.
- [ ] 4.6 Add audio recording composer flow: permission handling, review before send, cancel, send through existing media pipeline and thread player.
- [ ] 4.7 Add tests for edit/delete audit behavior, reactions, audio recording fallbacks and message menu availability.

## 5. Provider-Dependent Closure

- [ ] 5.1 Capture sanitized real payload for WhatsApp reply inbound in Wuzapi and Evolution before changing normalizers.
- [ ] 5.2 Freeze provider fixtures and update adapter tests for reply inbound, reactions and real `messages_update` receipts.
- [ ] 5.3 Complete Wuzapi smoke: 1:1 inbound after tunnel repair, same conversation, Realtime update, text reply, media send/receive, delivery/read and no false sync bubbles.
- [ ] 5.4 Complete Evolution smoke: same conversation reply, delivery/read, phone-originated send, media send/receive and persistence after restart.
- [ ] 5.5 Document provider gaps that remain non-blocking for local parity and keep unsupported UI paths disabled.

## 6. IA Readiness Without Automation

- [ ] 6.1 Persist or derive conversation eligibility for assistant triage from department default assistant without sending any message automatically.
- [ ] 6.2 Add server-side guard that prevents automatic first-response send unless a future explicit automation feature enables it.
- [ ] 6.3 Add placeholder-compatible data contract for future assisted draft generation using department assistant and conversation context.
- [ ] 6.4 Add tests proving new unassigned conversations with assistant default do not auto-send.

## 7. Final QA And Documentation

- [ ] 7.1 Run full verification: focused support tests, `bun run test:whatsapp-contracts`, `bun run lint`, `bun run build`.
- [ ] 7.2 Perform authenticated desktop/mobile QA for inbox, thread, composer, media viewer, departments and sound preference.
- [ ] 7.3 Perform two-tenant manual verification for conversations, attachments, departments, operator state and channel defaults when credentials are available.
- [ ] 7.4 Update `docs/worklog.md`, `docs/codex-backlog.md` and `docs/handoff.md` with completed items, remaining provider gaps and exact next smoke steps.
