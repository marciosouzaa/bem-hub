# BEM HUB Design System

This document is the source of truth for BEM HUB product UI. Use it before
creating, changing, or reviewing any workspace screen or shared component.

## Design Source And Hierarchy

The current visual direction comes from multiple sources, but they do not have
the same authority.

- Product positioning: BEM HUB is an AI operating system for Brazilian SMB
  operations.
- Product/design intent from the Stitch prompt: a premium SaaS AI workspace
  inspired by Linear, Notion, ChatGPT, Stripe Dashboard, Vercel, Raycast,
  Framer, Apple HIG, Material Design 3, and minimal Scandinavian software.
- Stitch frames in `public/frames`:
  - `BEM HUB _ Dashboard (Green).png`
  - `BEM HUB _ AI Agents (Green).png`
  - `BEM HUB _ Knowledge Base (Green).png`
- Current implementation tokens in `src/app/globals.css`.

When these sources conflict, use this priority:

1. Product/design intent from the Stitch prompt and product positioning.
2. This design system as the implementation contract.
3. Existing product frames in `public/frames` as reference explorations.
4. Current app tokens and local primitives as migration starting point.

The Stitch prompt defines the target experience. The frames are useful visual
explorations, not final UI contracts. The current implementation is a starting
point, not a ceiling.

Important implication for component standardization: do not merely wrap the
current UI into reusable components. Standardize components toward the target
experience: cleaner, more premium, more spacious, smoother, and more consistent.

The frames validate an important direction: BEM HUB should not become a generic
white SaaS dashboard. It should remain a dark, calm, operational AI workspace.
However, future implementation should pull the product closer to the prompt's
premium quality bar: better spacing, softer surfaces, richer component states,
more refined motion, and stronger visual hierarchy.

Purple, cyan, electric blue, and soft AI gradients are allowed as secondary
intelligence accents. Green remains the primary operational signal for healthy,
active, complete, live, and primary action states.

## Target Experience

BEM HUB should feel like:

- Linear's clarity.
- Notion's calm content focus.
- ChatGPT's conversational simplicity.
- Stripe Dashboard's business polish.
- Vercel's crisp technical confidence.
- Raycast's command-driven speed.
- Framer's refined motion.

The target is not a literal copy of any of them. The product should have its own
identity: a premium AI operating system for SMB operations.

Desired qualities:

- Clean.
- Modern.
- Elegant.
- Minimal.
- Fast.
- Fluid.
- Trustworthy.
- Quietly intelligent.
- Designed for long daily usage.

Avoid both extremes:

- Too dense: feels like internal admin software.
- Too airy or marketing-like: feels like a landing page instead of a work tool.

The correct balance is **premium operational calm**.

## Product Feel

BEM HUB should feel like an AI operating system for business work:

- Calm technology.
- Premium, not decorative.
- Content-focused, not visually busy.
- Spacious enough to feel expensive.
- Dense enough to support real daily operations.
- Technical, trustworthy, and fast.
- Content first, decoration second.
- Delightful in motion and interaction.
- Portuguese UI copy by default.

The target reaction is: `quero usar isso todos os dias`.

## Design Principles

- Simplicity first.
- AI-first interactions.
- Content before decoration.
- Consistency over novelty.
- Progressive disclosure.
- Accessibility by default.
- Motion with purpose.
- Zero unnecessary friction.
- Business clarity over visual spectacle.

Every screen must answer within 3 seconds:

- What can I do here?
- What is most important?
- What needs attention?
- What action should I take next?

## Visual Signature

The signature visual motif is the **premium operational AI console**:

- Fixed dark sidebar.
- Compact topbar with search and command entry.
- Low-contrast dark panels.
- Green active states, execution states, and primary actions.
- Subtle grid, glow, and radial depth only around AI/execution surfaces.
- Modular cards that feel rearrangeable without looking like generic widgets.
- Rounded, soft, premium surfaces.
- Microinteractions that make the interface feel alive but never distracting.

Avoid a marketing-site look inside the workspace. Avoid ornamental gradients,
large empty hero compositions, and decorative illustration unless a screen is
explicitly public-facing.

The aesthetic risk BEM HUB owns: it can look like a calm command center rather
than a conventional SaaS dashboard. Use command/search, AI status, execution
signals, and contextual panels as recurring structure.

## Layout System

Use an 8px spacing system:

- `4`
- `8`
- `12`
- `16`
- `24`
- `32`
- `40`
- `48`
- `64`
- `80`
- `96`
- `128`

Responsive breakpoints:

- Mobile: `360px`
- Tablet: `768px`
- Laptop: `1024px`
- Desktop: `1440px`
- Large desktop: `1920px`

Workspace shell:

- Desktop sidebar: `256px`.
- Topbar height: `64px`.
- Main dashboard max width: `1120px` to `1280px`.
- Premium dashboard and billing screens may use `1280px`.
- Content-heavy modules may use `1280px` to `1440px`.
- Do not use full-width content unless the workflow needs canvas space
  such as automation builder or agent execution flow.

Grid:

- Desktop product pages use 12 columns conceptually.
- Dashboards commonly use `lg:grid-cols-[1fr_282px]`.
- Workflows can use two-panel layouts: nav/context side rail plus main content.
- Cards must align to a clear grid. Avoid masonry unless user-controlled
  rearrangement exists.

## Color Tokens

Current implementation tokens live in `src/app/globals.css`.

Dark theme is primary.

| Token | Dark | Usage |
| --- | --- | --- |
| `background` | `#0d0f0f` | App background |
| `sidebar` | `#101212` | Fixed navigation |
| `panel` | `#151716` | Cards and main panels |
| `panel-elevated` | `#1c1e1d` | Buttons, list rows, dropdowns |
| `panel-subtle` | `#111413` | Composer bars, nested surfaces |
| `panel-border` | `#242a27` | Hairline borders |
| `foreground` | `#ebecea` | Primary text |
| `muted-strong` | `#c5ccc7` | Body text |
| `muted` | `#a5ada7` | Metadata and inactive labels |
| `primary` | `#4ee3a3` | Primary actions and active AI state |
| `accent` | `#24c78b` | Secondary green accent |
| `warning` | `#f2c94c` | Processing, attention |
| `danger` | `#ff6b6b` | Destructive, failed, confidential |

Light theme exists but is secondary. Keep it calm and usable; do not redesign
the product around light mode.

Semantic rules:

- Green: healthy, active, primary action, live AI, synced, complete.
- Warning: queued, processing, attention required.
- Red: destructive, failed, confidential, blocked.
- Gray: inactive, idle, disabled, historical.
- Blue/cyan/purple: reserved for AI intelligence layers, model/context states,
  command surfaces, advanced analytics, and rare premium emphasis.

Do not create one-note palettes. Even with green as the signal, most surfaces
must remain neutral.

Gradient rules:

- Use gradients sparingly.
- Prefer soft radial depth over loud linear gradients.
- AI gradient direction, when needed: electric blue to purple with cyan edge
  light.
- Never use purple/blue gradients as the default app background.
- Never add decorative gradient blobs or bokeh.

## Typography

Current implementation uses Geist:

- Primary: Geist Sans.
- Data/code: Geist Mono.

Stitch may output Inter; map Inter concepts to Geist unless the project
explicitly migrates font families.

Type scale:

| Role | Size | Weight | Line height | Usage |
| --- | ---: | ---: | ---: | --- |
| Display XL | 48-56 | 650-700 | 1.05 | Rare public hero only |
| Display | 40-44 | 650-700 | 1.1 | Major app entry headings |
| H1 | 34-40 | 650-700 | 1.15 | Page titles |
| H2 | 26-30 | 600-650 | 1.2 | Section titles |
| H3 | 20-22 | 600 | 1.25 | Card group titles |
| Title | 16-18 | 600 | 1.35 | Card titles |
| Body large | 16-18 | 400-500 | 1.6 | Intro copy |
| Body | 14-15 | 400-500 | 1.55 | Standard UI text |
| Body small | 13 | 400-500 | 1.45 | Supporting copy |
| Caption | 12 | 400-600 | 1.35 | Metadata |
| Label | 11-12 | 600-700 | 1.2 | Uppercase section labels |

Rules:

- Do not use negative letter spacing.
- Use uppercase labels sparingly with `0.08em` to `0.12em` tracking.
- Dashboard metadata should be compact and muted.
- Never use hero-scale type inside cards, sidebars, dropdowns, or toolbars.

## Shape

Border radius:

- XS: `4px`
- SM: `8px`
- MD: `12px`
- LG: `16px`
- XL: `20px`
- 2XL: `24px`
- Full: `9999px`

Current product cards mostly use `8px`; treat that as legacy/current-state,
not the final target. The component standardization should migrate the product
toward a softer premium system:

- `8px` for compact row items, chips, small controls, dense list entries.
- `12px` as the default for buttons, inputs, cards, and dropdowns.
- `16px` for larger AI panels, execution cards, modals, and side panels.
- `20px` for premium overview cards, command surfaces, and major empty states.
- Avoid pill-shaped buttons except chips, badges, and avatars.

## Elevation

Use soft shadows only.

- Level 0: flat surface.
- Level 1: standard card.
- Level 2: dropdown/popover.
- Level 3: modal/dialog/drawer.
- Level 4: floating AI assistant or command palette.
- Level 5: toast/notification.

Dark surfaces rely more on border, translucency, and contrast than heavy shadow.
Shadows should be subtle, green glow should be rare, and no decorative orbs are
allowed.

Premium surface rules:

- Borders should usually be low contrast.
- Hover elevation should be noticeable but quiet.
- Focus glow may be stronger than hover glow for accessibility.
- Large glassmorphism panels are allowed only when they improve hierarchy.
- Avoid stacking too many framed surfaces inside each other.

## Motion System

Use `framer-motion` through `src/components/ui/motion.tsx`. Do not import
motion directly in pages unless a component needs a custom interaction that
cannot use shared primitives.

Durations:

- Instant state feedback: `80ms`.
- Fast hover/tap: `120-160ms`.
- Default transition: `200-240ms`.
- Slow reveal or panel entrance: `320-360ms`.
- Stagger: `45-60ms`.

Easing:

- Prefer spring-like or ease-out curves.
- Never use linear for visible interface motion.
- Existing shared easing should remain the default.

Motion patterns:

- Page: fade in, no dramatic movement.
- Section: opacity plus `8-10px` vertical movement.
- Card hover: lift `2px`, no exaggerated scale.
- Tap: compress to `0.995`.
- Sidebar active: color/fill transition, optional left rail.
- Command palette: subtle scale from `0.98` plus opacity.
- Streaming AI: text appears progressively; use a small green status indicator.
- Execution flows: animated progress line or pulsing node, not full-screen
  effects.

Reduced motion:

- All shared primitives must respect reduced motion.
- Core workflows must remain understandable with motion disabled.

Motion should make the product feel alive, not playful.

Fluidity requirements:

- Navigating between product modules should feel continuous.
- Expanding panels should preserve context.
- Streaming AI responses should feel immediate.
- Loading should use skeletons or progressive reveal rather than blocking
  spinners.
- Hover states should communicate affordance without making the UI bounce.

Do not ship a new reusable component without defining its default, hover,
focus, active, loading, disabled, error, and reduced-motion behavior.

## Component Standardization Direction

The next component pass should move BEM HUB from screen-specific UI toward a
coherent enterprise-grade component library.

This does not mean freezing the current look. It means extracting reusable
components while upgrading them toward the target experience:

- More whitespace.
- Softer radii.
- Cleaner state handling.
- Better focus and keyboard states.
- Less ad hoc color usage.
- Fewer one-off panels.
- Consistent motion.
- Better empty, loading, and error states.
- Clear API boundaries between UI and server-side business rules.

Prioritize components in this order:

1. Foundation primitives:
   `Button`, `IconButton`, `Input`, `TextArea`, `Select`, `Badge`, `Card`,
   `Avatar`, `Tooltip`, `Dropdown`, `Modal`, `Drawer`, `Tabs`, `Skeleton`.

2. Layout primitives:
   `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, `SectionHeader`,
   `ContentGrid`, `SplitPanel`, `ContextPanel`.

3. Product primitives:
   `KpiCard`, `UpgradeCTA`, `EmptyState`, `StatusBadge`, `UsageMeter`,
   `ActivityFeed`, `CommandSearch`.

4. AI primitives:
   `PromptComposer`, `ChatBubble`, `StreamingResponse`,
   `AIThinkingIndicator`, `AssistantCard`, `KnowledgeCitation`,
   `ModelSelector`, `TokenUsage`, `ToolCallViewer`.

5. Future workflow primitives:
   `AgentCard`, `ExecutionTimeline`, `WorkflowNode`, `FlowConnector`,
   `AutomationRunCard`.

Component quality bar:

- Stable sizing.
- No layout shift between states.
- Responsive by default.
- Accessible by default.
- Uses semantic tokens, not raw colors.
- Can be used in dark and light theme.
- Has purposeful motion.
- Does not own authorization or billing rules.

When refactoring existing UI, do not extract a poor component merely because it
is repeated. First define the desired component contract, then migrate call
sites.

Implemented layout primitives live in `src/components/app`:

- `PageLayout`: page container with standard responsive padding and max width.
- `PageHeader`: responsive title, description, eyebrow, and action row.
- `SectionHeader`: compact section heading with optional marker and actions.
- `ContentGrid`: responsive card grid for 1 to 4 columns.
- `SplitPanel`: main content plus left or right context rail.
- `ContextPanel`: stacked side rail with optional desktop sticky behavior.
- `CommandSearch`: shared command/search input for shell and future command UI.
- `MobileShell`: mobile navigation drawer for the workspace shell.

## Core Components

Required reusable primitives:

- `Button`
- `IconButton`
- `Input`
- `TextArea`
- `SearchBar`
- `Select`
- `Combobox`
- `Avatar`
- `Badge`
- `Chip`
- `Tooltip`
- `Popover`
- `Dropdown`
- `Toast`
- `Alert`
- `Modal`
- `Drawer`
- `Tabs`
- `Accordion`
- `Card`
- `KpiCard`
- `EmptyState`
- `Skeleton`
- `Timeline`
- `Sidebar`
- `Topbar`
- `Breadcrumb`
- `Pagination`
- `ActivityFeed`
- `PageHeader`
- `SectionHeader`
- `StatusBadge`
- `UsageMeter`
- `CommandSearch`
- `SplitPanel`
- `ContextPanel`

AI-specific components:

- `AssistantCard`
- `AgentCard`
- `PromptComposer`
- `AIThinkingIndicator`
- `StreamingResponse`
- `KnowledgeCitation`
- `WorkflowNode`
- `FlowConnector`
- `AutomationTimeline`
- `TokenUsage`
- `ModelSelector`
- `ToolCallViewer`
- `MemoryViewer`
- `ContextPanel`

Implementation rule: create shared components when the same UI pattern appears
in two screens or when a domain component owns behavior/state beyond basic
presentation. Shared components should represent the target system, not just
the current screen implementation.

## Buttons

Variants:

- Primary: green fill, dark text. Use for creation, AI execution, approval.
- Secondary: elevated dark surface. Use for neutral actions.
- Ghost: sidebar/topbar utilities and low-emphasis actions.
- Outline: filters and segmented options.
- Danger: abort/destructive actions.
- AI Gradient: reserved for public marketing or rare premium AI actions; avoid
  in daily workspace controls.

Sizes:

- XS: compact row actions.
- SM: filters and inline actions.
- MD: standard forms.
- LG: primary page CTAs.
- Icon: square, stable dimensions.

States:

- Default.
- Hover.
- Focus visible.
- Loading.
- Disabled.

All buttons need stable dimensions so labels, icons, hover, and loading states
do not shift layout.

Target shape:

- Default buttons use `12px` radius.
- Icon buttons use square dimensions and familiar icons.
- Primary buttons should feel crisp and premium, not oversized or glossy.
- Loading state preserves width and label context when possible.
- Destructive actions require danger styling and, where risk is high,
  confirmation.

## Inputs

All inputs should share:

- Dark/elevated surface.
- Soft border.
- Clear focus ring or focus border using `primary`.
- Placeholder in muted text.
- Validation states with specific messages.
- Minimum target height `40px`, touch target `44px` where practical.

Use textareas for prompt composers, with Enter-to-send only where clearly
expected by the workflow.

Target shape:

- Default radius: `12px`.
- Search bars may use `16px`.
- Prompt composers may use `16px` to `20px`.
- Focus state should feel premium: border plus subtle glow, not harsh outline
  only.

## Cards

Cards are the main building block.

Variants:

- Dashboard card.
- KPI card.
- Assistant card.
- Agent card.
- Knowledge document card.
- Analytics card.
- Integration tile.
- Upgrade/plan card.
- Execution panel.

Rules:

- Use `bg-panel`, `border-panel-border`, and restrained shadow.
- Avoid cards inside cards unless rendering repeated list rows inside a larger
  dashboard card.
- Keep card headers compact.
- Use icon tiles to identify domain, not decorative illustrations.
- Cards should not be generic containers for entire page sections.

Target card shape:

- Standard card radius: `12px`.
- Large AI/execution cards: `16px`.
- Premium overview/empty cards: `20px`.
- Card padding should usually be `20px` to `24px`; dense list cards may use
  `12px` to `16px`.
- Use card-level hover only for clickable cards.

## App Shell

Sidebar:

- Fixed desktop column.
- Dark background.
- Brand lockup at top.
- Compact nav with icon and label.
- Active item uses translucent green fill and green icon/text.
- Bottom primary AI action remains visible on desktop.
- Mobile should collapse into a drawer or compact top nav later.
- Future refinement should add workspace selector and command/search entry
  without making the sidebar visually heavy.

Topbar:

- Search or command input is dominant.
- Utility actions are compact icon buttons.
- User/org identity at far right.
- Do not overload topbar with page-specific actions; put those in page header.
- AI quick command may live beside global search once command palette exists.

## Screen Patterns

### Dashboard

Job: show operational state and fast entry points.

Must include:

- Personalized greeting.
- Productivity summary.
- KPI cards.
- Active assistants.
- Running agents.
- Recent conversations.
- Quick actions.
- Integrations.
- System status.

Do not make it a marketing hero. It is a working cockpit.

Target direction:

- More premium whitespace than the current implementation.
- Modular widgets that could eventually be rearranged.
- Clear next actions without visual overload.
- Skeletons for every dashboard widget.

### Chat / Conversations

Job: ask assistants and preserve company history.

Must include:

- ChatGPT-inspired message area.
- Assistant selector for new conversations.
- Locked assistant for existing conversations.
- Conversation history rail.
- Prompt composer.
- Streaming response.
- Stop generation.
- Empty state with next action.
- Usage/plan state.
- Future context/sidebar area for citations and selected knowledge sources.

Message bubbles:

- User messages align right with subtle green surface.
- Assistant messages align left with icon/avatar.
- Preserve whitespace.
- Avoid excessive bubble decoration.

Target direction:

- Prompt composer should become a reusable premium component.
- Context sidebar should become optional and collapsible.
- Suggested prompts should appear only in empty/new conversation state.
- Citations and tool calls should be visually calm and inspectable.

### Assistants

Job: manage official company AI specialists.

Cards should include:

- Avatar/icon.
- Name.
- Area.
- Description.
- Model/temperature.
- Default state.
- Last usage when available.
- Quick launch when chat supports it.
- Favorite/pin later if useful.

Management actions remain server-authorized.

Target direction:

- Cards should support quick launch into chat.
- Favorite/pin can exist later, but avoid adding unused controls.
- Assistant cards should feel like official company capabilities, not
  marketplace tiles.

### AI Agents

Job: monitor autonomous or semi-autonomous execution.

Use the frame pattern:

- Intelligence cluster label.
- Hero execution panel.
- Horizontal pipeline.
- Active node state.
- Abort action.
- Analytics action.
- Deployment timeline.
- Logs/details progressively disclosed.

Agents are later roadmap. Do not overbuild before MVP chat, knowledge, and
manual automations are stable.

Target direction:

- Treat the agent execution panel as one of BEM HUB's signature components.
- Motion should clarify execution state: current node, completed nodes,
  pending nodes, failed node.

### Knowledge Base

Job: organize company documents and make them useful to AI.

Use the frame pattern:

- Left directory/filter rail.
- Folder counts.
- Tags/keywords.
- Active agents/auditors.
- Main document list.
- AI summary preview.
- Tags and confidentiality badges.
- Updated metadata.
- Upload dropzone.
- Knowledge pulse recommendation card.

Future document details should include citations, chunks, extraction status,
and reprocessing state.

Target direction:

- Document cards should foreground AI summary and source metadata.
- Upload should be a premium dropzone with clear processing states.
- Confidential and failed states need stronger visual semantics.

### Automation Builder

Job: build manual AI workflows.

Direction:

- Inspired by n8n, but calmer and cleaner.
- Rounded nodes.
- Smooth curved connectors.
- Animated execution flow.
- Clear input/output panels.
- Typed templates before free-form builder.

Do not start with a complex canvas until manual automation templates exist.

### Analytics

Job: executive usage and operational value.

Direction:

- Simple charts.
- Readable metrics.
- No dense table-first UI.
- Focus on usage, cost, time saved, assistant adoption, document coverage.

## Status System

Statuses:

- Active: green dot/badge.
- Complete: green.
- Processing: warning or green animated progress.
- Pending: muted gray.
- Idle: muted gray.
- Failed: danger.
- Confidential: danger-tinted badge.
- Blocked by plan: warning card plus upgrade CTA.

Every status must include text, not color alone.

## Empty States

Empty states are invitations to act, not marketing copy.

Pattern:

- Domain icon tile.
- One-line title.
- Short reason.
- Primary next action.
- Optional secondary action.

Examples:

- `Nenhum assistente cadastrado`
- `Inicie uma conversa`
- `Envie o primeiro documento`
- `Nenhuma automação executada`

## Loading And Skeletons

Use skeletons for:

- Cards.
- Lists.
- Conversation messages.
- Document explorer.
- Analytics charts.

Skeletons should match final dimensions to avoid layout shift.

For AI execution:

- Use `AIThinkingIndicator` or compact status row.
- Do not use large spinners as the main experience.

## Accessibility

Target WCAG AA.

Rules:

- Keyboard-first.
- Visible focus ring.
- Minimum touch target `44px`.
- Do not rely on color alone.
- Use semantic buttons/links.
- Modal focus trap when modals exist.
- All icon-only buttons need accessible labels.
- Text must not overlap or overflow on mobile.
- Respect reduced motion.

## Responsive Rules

Desktop is primary for MVP, but every implemented screen must remain usable on
mobile.

Rules:

- Sidebar collapses or hides below desktop.
- Topbar search can shrink or become icon-triggered.
- Page grids collapse to one column.
- Composer stays reachable.
- Cards keep stable dimensions.
- Avoid horizontal scrolling except intentional workflow canvases.
- Text inside buttons/cards must wrap or truncate cleanly.

## Product Voice

Use Portuguese by default.

Tone:

- Direct.
- Operational.
- Calm.
- Specific.
- No hype.

Good labels:

- `Criar assistente`
- `Perguntar à IA`
- `Enviar documento`
- `Revisar fusão`
- `Convidar membro`
- `Abrir histórico`
- `Solicitar upgrade`

Avoid:

- English UI copy unless source/system-specific.
- Clever labels.
- Vague errors.
- Marketing copy inside daily workflows.

## Iconography

Use `lucide-react` in the app.

Rules:

- Size `16px` for inline actions.
- Size `20px` for buttons and card headers.
- Size `24px` for larger domain icons.
- Use consistent stroke.
- Prefer recognizable icons over text badges for standard actions.

The Stitch prompt mentions Material Symbols Rounded. Treat that as design
reference only unless the project explicitly changes icon libraries.

## AI Pattern Language

AI-specific UI must show what is happening and why it matters.

Patterns:

- Thinking state.
- Streaming response.
- Sources/citations.
- Tool calls.
- Memory/context panel.
- Token/model usage.
- Confidence/insufficient context.
- Human review needed.
- Plan limit reached.

Rules:

- Never hide AI uncertainty.
- Always cite sources once RAG exists.
- Show when an answer is based only on chat context.
- Avoid anthropomorphic UI copy.

## Pending Design Decisions

These areas are not fully defined yet and should be resolved as the related
modules are built:

1. Mobile navigation pattern.
   Decide between drawer sidebar, bottom nav, or command-first navigation.

2. Command palette.
   Define visual states, keyboard shortcuts, search grouping, and AI quick
   command behavior.

3. Chat context sidebar.
   Define citations, selected assistant metadata, model usage, and knowledge
   references.

4. Document detail page.
   Define extracted text view, chunk/source inspection, reprocess actions, and
   failed ingestion states.

5. Assistant quick launch.
   Define whether assistant cards open chat directly, open details, or expose a
   split action.

6. Agent timeline and logs.
   Define log density, collapsed/expanded states, abort confirmation, and audit
   trail.

7. Automation builder.
   Start with template forms before full node canvas. Define node grammar only
   when templates are stable.

8. Upgrade and billing flow.
   Current flow is manual CTA. Later define checkout, invoice state, blocked
   module states, and admin-only plan management.

9. Toast system.
   Define success/error/loading toasts and when to use inline errors instead.

10. Light theme QA.
    Dark theme is primary. Light theme needs visual QA after core screens
    stabilize.

## Implementation Checklist

Before shipping UI work:

- Uses existing tokens from `src/app/globals.css`.
- Uses local primitives where possible.
- UI copy is Portuguese.
- Business rules remain server-side.
- Multi-tenant data is scoped by `organization_id`.
- Loading, empty, error, disabled, hover, focus states are covered.
- Layout works on mobile and desktop.
- Motion uses shared primitives and respects reduced motion.
- No text overlap or button overflow.
- `bun run lint` passes.
- `bun run build` passes for meaningful app changes.
