## Context

See `proposal.md` for motivation. Current shared primitives already include
`DropdownMenu`, `Dialog`, `Drawer`, `EntityDrawer`, `DataTable`, `FormField`,
and `FormSection`. The issue is uneven adoption: `UserMenu` still uses
`details`/`summary` and an absolutely positioned panel; other screens repeat
inline alerts, status badges, native confirmations, and large client
components.

Current layer shape:

```text
app shell
  sidebar z-40
  topbar normal stacking context
  mobile drawer z-50
  dialog/drawer z-50
  dropdown primitive z-70
  user menu manual absolute z-50 inside topbar subtree
```

Desired shape:

```text
layout layer      shell/sidebar/topbar
overlay layer     dropdown/popover menus through portal
modal layer       dialogs and drawers through portal
feedback layer    future toast/notification surfaces
```

## Goals / Non-Goals

**Goals:**

- Make overlay priority predictable by default.
- Convert the visible `UserMenu` issue to shared dropdown primitives.
- Create a small, reusable vocabulary for feedback, status, identity/details,
  and confirmations.
- Reduce files that exceed frontend size budgets by extracting real product
  responsibilities, starting with high-change areas.
- Keep server components as data/loading boundaries and client components as
  small interactive leaves.

**Non-Goals:**

- No visual redesign of the workspace.
- No change to RLS, Supabase schema, billing, channel provider contracts, or AI
  execution.
- No universal `CrudPage` abstraction.
- No broad rewrite of Atendimento before the current support parity work is
  isolated.

## Decisions

### 1. Centralize z-index as semantic UI layers

Use CSS variables or named Tailwind-friendly layer classes for shell, overlay,
modal, and feedback layers. This avoids scattered `z-40`, `z-50`, and `z-[70]`
values that compete without documenting priority.

Alternative considered: keep raw Tailwind z-index values. Rejected because it
does not prevent the next one-off component from choosing the wrong number.

### 2. Portal overlays by default

Dropdowns, submenus, dialogs, and drawers should render outside local stacking
contexts. Components that need overlay behavior should use shared primitives,
not `details`/`summary` or local absolute panels.

Alternative considered: raise `UserMenu` z-index only. Rejected because it fixes
one symptom while preserving the fragile implementation pattern.

### 3. Extract global primitives by repeated responsibility

Prioritized candidates:

- `FeedbackMessage`: success, error, warning, info inline messages.
- `StatusBadge`: shared semantic badge API.
- `IdentityCell`: avatar/icon + title + metadata for tables.
- `DetailList`: label/value rows in context panels.
- `ConfirmDialog` adoption: replace `window.confirm`.
- `Viewport`/`useMediaQuery` helper: replace repeated `matchMedia` code.

Alternative considered: extract all repeated markup immediately. Rejected
because some repetition is domain-specific and premature abstraction would make
features harder to read.

### 4. Split large components along workflow seams

Componentization targets should follow product responsibilities:

- `chat-workspace.tsx`: prompt composer, message list, message bubble,
  citations, conversation rail.
- `support-inbox-shell.tsx`: toolbar, advanced filters, tabs, list pane,
  mobile layout coordinator.
- `support-message-composer.tsx`: text composer, reply context, media dialog,
  media preview hook.
- `app/knowledge/page.tsx`: move document list/search/cards into
  `src/features/knowledge-base`.

Alternative considered: split strictly by line count. Rejected because smaller
files with vague names do not improve maintainability.

## Risks / Trade-offs

- Changing overlay layers could affect existing dialogs or media viewer.
  Mitigation: update primitives first, then QA menu/dialog/drawer/media viewer.
- Refactoring support components while support parity work is dirty could mix
  scopes. Mitigation: start with `UserMenu` and global tokens, then isolate or
  checkpoint support work before deeper splits.
- New primitives can become over-configured. Mitigation: use small APIs and
  migrate only two or more real call sites before generalizing.

## Migration Plan

1. Add semantic layer variables/classes and update existing primitives to use
   them.
2. Migrate `UserMenu` to the shared dropdown primitive.
3. Add focused guard tests or lint-friendly checks where practical for no manual
   operational dropdowns.
4. Introduce `FeedbackMessage`/`StatusBadge` and replace the most repeated
   inline alerts.
5. Replace `window.confirm` in knowledge document deletion with
   `ConfirmDialog`.
6. Split high-change large client components in small follow-up tasks, one
   workflow at a time.

Rollback is straightforward for each step because no schema or external API
changes are involved.
