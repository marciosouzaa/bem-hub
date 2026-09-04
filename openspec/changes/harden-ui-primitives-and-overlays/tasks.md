## 1. Baseline And Scope Control

- [x] 1.1 Record current dirty worktree scope and keep support parity changes separate from this UI foundation change
- [x] 1.2 Run a focused audit for manual operational dropdowns, native confirmations, raw z-index values, repeated feedback UI, and oversized client components

## 2. Overlay Layer Foundation

- [x] 2.1 Add semantic layer tokens for shell, overlay, modal, and feedback surfaces
- [x] 2.2 Update shared dropdown, dialog, drawer, and shell surfaces to use semantic layers instead of arbitrary z-index values
- [ ] 2.3 Verify menu, dialog, drawer, and media viewer stacking after the layer update

## 3. Immediate Defect Fix

- [x] 3.1 Migrate `UserMenu` from `details`/`summary` and absolute panel markup to the shared dropdown primitive
- [x] 3.2 Preserve theme toggle, logout, identity display, role badge, keyboard dismissal, outside click, and focus return
- [ ] 3.3 Confirm the user menu renders above the topbar and adjacent controls in desktop and mobile shell contexts

## 4. Primitive Hardening

- [x] 4.1 Add a global bottom-center `FeedbackToastProvider` primitive for success, error, warning, and info notifications
- [x] 4.2 Add or refine remaining global primitives for inline feedback, semantic status badges, identity cells, detail lists, and media/control affordances where repeated patterns exist
- [x] 4.3 Replace `window.confirm` in knowledge document deletion with the shared confirmation dialog
- [x] 4.4 Add tests or structural checks for overlay primitives and destructive confirmation behavior where practical

## 5. Component Boundary Refactors

- [x] 5.1 Split `support-inbox-shell.tsx` into toolbar, filter, tab, list, and layout coordinator components after isolating current support work
- [x] 5.2 Split `support-message-composer.tsx` into text composer, reply context, media dialog, preview helpers, and send hook
- [x] 5.3 Split `chat-workspace.tsx` into conversation rail, message list, message bubble, prompt composer, and citation components
- [x] 5.4 Move knowledge page document list/search/cards from route file into `src/features/knowledge-base`

## 6. Verification

- [x] 6.1 Run `bun run lint`
- [x] 6.2 Run `bun run build`
- [ ] 6.3 Perform visual QA for topbar user menu, dropdowns inside scrolling panels, dialogs/drawers, and mobile shell
- [x] 6.4 Update `docs/worklog.md` with the completed slice and remaining follow-ups
