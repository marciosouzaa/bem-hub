---
name: bem-hub-frontend-design
description: Apply BEM HUB's repository-specific frontend design system. Use when creating, changing, reviewing, or refactoring UI in this repo, especially pages under src/app, shared components under src/components/ui, workspace screens, dashboards, AI assistant flows, knowledge base screens, auth screens, navigation, cards, forms, status indicators, or any work that must follow the premium operational AI console language documented in docs/design-system.md.
---

# BEM HUB Frontend Design

Use this skill whenever UI is involved. It adapts the generic
`frontend-design` approach to BEM HUB's product, audience, and target design
system.

## Required Context

Before editing UI, read:

- `docs/design-system.md`
- `src/app/globals.css`
- Existing local primitives in `src/components/ui`
- The page or component being changed

If the task touches Next.js behavior, also follow the repo `AGENTS.md` rule to
read the relevant local guide under `node_modules/next/dist/docs/`.

## Source Hierarchy

Follow this hierarchy:

1. Product/design intent from the Stitch prompt and product positioning.
2. `docs/design-system.md` as the implementation contract.
3. Frames in `public/frames` as reference explorations.
4. Current implementation as migration starting point.

Do not freeze the current UI into components. Standardize toward the target
experience: cleaner, more premium, more spacious, smoother, and more
consistent.

## Design Direction

BEM HUB is a premium operational AI console for Brazilian SMB operations. It
should feel like a focused mix of Linear clarity, Notion calm, ChatGPT
simplicity, Stripe polish, Vercel technical confidence, Raycast speed, and
Framer motion.

Preserve these traits:

- Dark mode as the primary product experience.
- Premium operational calm: spacious enough to feel expensive, dense enough
  for daily work.
- Green as the operational signal for primary action, healthy state, active AI,
  synced data, and live processing.
- Blue/cyan/purple only as secondary intelligence accents.
- Muted gray for idle, pending, secondary text, and inactive navigation.
- Red only for destructive, confidential, failed, or risk states.
- Portuguese product copy by default.

## Workflow

1. Identify the product job of the screen before styling it.
2. Reuse existing primitives first, but improve them toward the target system
   when needed.
3. Build with the established app-shell pattern unless the task is explicitly a
   public marketing page.
4. Prefer `12px` default radius for buttons, inputs, cards, and dropdowns;
   keep `8px` for dense row items and chips.
5. Use real workflow labels and states.
6. Check responsive behavior for mobile and desktop. Text must not overflow or
   overlap.
7. Use shared motion primitives and respect reduced motion.
8. Run `bun run lint` and `bun run build` for meaningful UI changes.

## Component Rules

Components should be standardized in this order:

1. Foundation primitives: `Button`, `IconButton`, `Input`, `TextArea`,
   `Select`, `Badge`, `Card`, `Avatar`, `Tooltip`, `Dropdown`, `Modal`,
   `Drawer`, `Tabs`, `Skeleton`.
2. Layout primitives: `AppShell`, `Sidebar`, `Topbar`, `PageHeader`,
   `SectionHeader`, `ContentGrid`, `SplitPanel`, `ContextPanel`.
3. Product primitives: `KpiCard`, `UpgradeCTA`, `EmptyState`, `StatusBadge`,
   `UsageMeter`, `ActivityFeed`, `CommandSearch`.
4. AI primitives: `PromptComposer`, `ChatBubble`, `StreamingResponse`,
   `AIThinkingIndicator`, `AssistantCard`, `KnowledgeCitation`,
   `ModelSelector`, `TokenUsage`, `ToolCallViewer`.

Shared components must have stable sizing, accessible focus, hover/loading/
disabled/error states, reduced-motion behavior, and semantic tokens. They must
not own authorization, billing, or tenant isolation rules.

## Avoid

- Generic light SaaS dashboards.
- Turning Stitch frames into final constraints.
- Purple/blue gradients as default app backgrounds.
- Decorative orbs, bokeh, or visual effects without workflow value.
- Landing-page hero patterns inside the workspace.
- Unscoped redesigns unrelated to the requested feature.
- Business rules inside client-only UI components.
- English UI copy unless a source artifact or user explicitly asks for it.
