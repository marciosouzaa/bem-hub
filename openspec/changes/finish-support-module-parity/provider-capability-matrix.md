# Atendimento Provider Capability Matrix

Task: `1.2 Create a provider capability matrix for Wuzapi and Evolution`.

Legend:

- `implemented`: code path exists.
- `tested`: adapter/webhook tests cover expected contract.
- `smoke-partial`: real smoke exists but not full closure.
- `pending-smoke`: needs real provider validation.
- `missing`: no product/server behavior yet.
- `blocked-by-payload`: needs sanitized real webhook fixture before declaring done.

## Matrix

| Capability | Wuzapi | Evolution | Notes |
| --- | --- | --- | --- |
| Managed provisioning | implemented, tested, smoke-partial | implemented for local instance, smoke-partial | Wuzapi has managed server-owned credentials/QR/webhook. Evolution local instance paired and first outbound validated, but full managed parity still not provider choice. |
| Webhook configure | implemented, tested | implemented, tested | Wuzapi configures HMAC + `Message`/`ReadReceipt`. Evolution configures `MESSAGES_UPSERT`/`MESSAGES_UPDATE`. |
| Webhook drift health | implemented, tested, smoke-partial | implemented, tested, pending-smoke | Both detect URL drift; Wuzapi drift repair already used after tunnel issue. |
| Inbound text | implemented, tested, smoke-partial | implemented, tested, pending-smoke | Wuzapi 1:1 after latest tunnel repair still needs repeat; Evolution phone-originated send still pending. |
| Outbound text | implemented, tested, smoke-partial | implemented, tested, smoke-partial | Wuzapi managed first outbound passed. Evolution first outbound passed. |
| Phone-originated outbound | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Normalized as `message.sent_by_phone`; real same-thread smoke remains pending. |
| Outbound quoted reply | implemented, tested, smoke-partial | implemented, tested, smoke-partial | BEM HUB to WhatsApp quote works for text/media per worklog; keep provider smoke in final matrix. |
| Inbound quoted reply | implemented-search, tested-fixture, blocked-by-payload | implemented-search, tested-fixture, blocked-by-payload | Code searches `ContextInfo.StanzaId`/nested context, but real payload previously arrived without reference. Must capture sanitized fixture. |
| Outbound image | implemented, tested, pending-smoke | implemented, tested, smoke-partial | Evolution image send passed. Wuzapi large image in production still pending after signed upload change. |
| Outbound video | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Needs real send smoke in both providers. |
| Outbound audio file | implemented, tested, pending-smoke | implemented, tested, pending-smoke | File upload exists; microphone recording missing. |
| Outbound document | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Needs real smoke and download validation. |
| Inbound image | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Wuzapi receives Base64 in webhook; Evolution downloads server-side. Needs real comparative smoke. |
| Inbound video | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Needs real comparative smoke. |
| Inbound audio | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Needs real smoke plus audio player QA. |
| Inbound document | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Needs real smoke plus authenticated download QA. |
| Delivery receipt | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Wuzapi `ReadReceipt`; Evolution `messages.update`. Real callback fixture still needed. |
| Read receipt | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Same as delivery; verify provider-specific statuses against real callbacks. |
| Inbound reaction | missing | missing | Provider-neutral event contract lacks reaction webhook type and persistence/rendering. |
| Outbound reaction | implemented adapter only | implemented adapter only | Adapters expose `sendReaction`; product route/RPC/UI not implemented. |
| Edit remote message | missing | missing | No provider-neutral contract. Must stay unsupported until provider feasibility confirmed. |
| Delete remote message | missing | missing | No provider-neutral contract. Local audited hide/delete can be product-only later. |
| Contact avatar | implemented, tested, pending-smoke | implemented, tested, pending-smoke | Migration applied remotely; smoke needs contact with public profile photo. |
| Ignore protocol/history sync | implemented, tested | implemented, tested | Blocks false sync bubbles from protocol-only/history packages. |
| Ignore groups | implemented, tested | implemented, tested | Groups disabled in product unless toggle; inbound group events ignored by current contract. |
| Storage tenant isolation | provider-neutral implemented | provider-neutral implemented | Route filters `support_message_attachments.organization_id`; needs two-tenant smoke in final gates. |

## Provider-Specific Notes

### Wuzapi

Strengths:

- Managed provisioning path exists.
- HMAC signature verification exists.
- Sends text/media/reaction through adapter.
- Webhook normalizes text, media, phone-originated messages, delivery/read
  receipts and quoted stanza when payload includes it.
- Current webhook filters protocol-only sync noise, groups and unsupported JIDs.

Risks:

- Latest real inbound 1:1 after tunnel repair still needs repeat.
- Reply inbound needs real sanitized payload because previous smoke did not
  link quoted reference.
- Large media send in production needs smoke after signed upload flow.
- Avatar depends on WhatsApp privacy/public profile photo.

### Evolution

Strengths:

- Local Evolution API `2.3.7` path exists.
- Webhook secret and instance verification exist.
- Sends text/media/reaction through adapter.
- Inbound media can be downloaded server-side by provider API.
- Uses pure Base64 on send, matching observed Evolution validation.

Risks:

- Full same-conversation smoke remains pending: reply, delivery/read,
  phone-originated send and persistence after restart.
- Reply inbound needs real sanitized payload.
- Media receive for all four types still needs real comparative smoke.

## Capability Gate Rules

- A capability is not `done` if it only exists in adapter code and has no
  product route/RPC/UI.
- A provider-dependent inbound feature is not `done` until there is sanitized
  real payload fixture and test.
- A local product feature can be completed even when remote provider parity is
  unavailable, but UI must show explicit unsupported/pending state.
- Remote edit/delete must remain unavailable until provider feasibility and
  audit semantics are known.
- Automatic IA response remains out of scope even if department assistant is
  configured.
