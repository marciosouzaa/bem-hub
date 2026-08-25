# Verification Baseline

Task: `1.4 Run current gates and record baseline`.

Date: 2026-08-19

## Commands

```powershell
bun run test:whatsapp-contracts
```

Result: passed.

- 51 tests passed.
- 0 failed.
- Covered channel schemas, adapters, Evolution webhook, Wuzapi webhook,
  endpoint token, webhook ingress health and start support conversation
  contracts.

```powershell
bun test src/features/support/support-message-action-availability.test.ts src/features/support/support-reply-preview.test.ts src/features/support/send-support-message.test.ts src/features/support/support-inbox-filters.test.ts src/features/support/realtime.test.ts
```

Result: passed.

- 16 tests passed.
- 0 failed.
- Covered safe message action availability, reply preview, send/retry contract,
  inbox filters and Realtime contract.

```powershell
bun run lint
```

Result: passed.

```powershell
bun run build
```

Result: passed.

- Next.js 16.2.9.
- Build compiled successfully.
- TypeScript completed.
- Static generation completed for 26 routes.

## Baseline Notes

- No real provider smoke was performed in this baseline.
- Existing tunnel log changes were already present and were not modified by
  this task.
- Open provider gaps remain tracked in `provider-capability-matrix.md`.
