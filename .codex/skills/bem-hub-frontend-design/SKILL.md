---
name: bem-hub-frontend-design
description: Apply BEM HUB's repository-specific frontend design system. Use when creating, changing, reviewing, or refactoring UI in this repo, especially pages under src/app, shared components under src/components/ui, workspace screens, dashboards, AI assistant flows, knowledge base screens, auth screens, navigation, cards, forms, status indicators, or any work that must follow the dark green "AI Operating System" visual language documented in docs/design-system.md.
---

# BEM HUB Frontend Design

Use this skill whenever UI is involved. It adapts the generic `frontend-design`
approach to BEM HUB's product, audience, and current visual system.

## Required Context

Before editing UI, read:

- `docs/design-system.md`
- `src/app/globals.css`
- Existing local primitives in `src/components/ui`
- The page or component being changed

If the task touches Next.js behavior, also follow the repo `AGENTS.md` rule to
read the relevant local guide under `node_modules/next/dist/docs/`.

## Design Direction

BEM HUB is an AI operating system for Brazilian SMB operations. The UI should
feel dark, focused, technical, calm, and efficient for daily work.

Preserve these traits:

- Dark shell with low-contrast panels.
- Green as the operational signal for primary action, healthy state, active
  agents, synced data, and live processing.
- Muted gray for idle, pending, secondary text, and inactive navigation.
- Red only for destructive, confidential, failed, or risk states.
- Dense SaaS layouts: fixed sidebar, compact topbar, searchable command area,
  dashboard cards, icon tiles, explicit status.
- Portuguese product copy by default.

## Workflow

1. Identify the product job of the screen before styling it.
2. Reuse existing primitives first: `Button`, `Card`, `Badge`, Tailwind tokens,
   and `lucide-react` icons.
3. Build with the established app-shell pattern unless the task is explicitly a
   public marketing page.
4. Keep cards at 8px radius, avoid nested cards unless rendering repeated list
   rows inside a dashboard card.
5. Use real workflow labels and states. Do not add decorative explanatory text
   about how the UI works.
6. Check responsive behavior for mobile and desktop. Text must not overflow or
   overlap.
7. Run `bun run lint` and `bun run build` for meaningful UI changes.

## Component Rules

Sidebar:

- Use dark background and compact navigation.
- Active item uses green text/icon and translucent green fill.
- Keep a bottom primary AI action on desktop when the screen has an app shell.

Topbar:

- Search or command input is the dominant element.
- Utility actions are compact icon buttons.
- User/org identity stays to the far right when space allows.

Cards:

- Use `bg-panel`, `border-panel-border`, subtle dark shadow.
- Use `os-panel-glow` only for dashboard hero/analytics emphasis.
- Keep metadata small and muted.

Buttons:

- Primary green for creation, AI, approval, and next-step actions.
- Secondary dark/elevated for neutral actions.
- Ghost for sidebar/topbar utility actions.
- Danger for abort/destructive operations.

Status:

- Active/healthy: green badge, dot, or progress line.
- Processing: green text plus progress indicator.
- Pending/idle: muted gray.
- Failed/destructive/risk: danger red.

## Avoid

- Generic light SaaS dashboards.
- Purple/blue gradients, beige palettes, decorative orbs, and marketing-style
  hero sections inside the app.
- Unscoped redesigns unrelated to the requested feature.
- Business rules inside client-only UI components.
- English UI copy unless a source artifact or user explicitly asks for it.
