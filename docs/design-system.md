# BEM HUB Design System

## Direction

BEM HUB should feel like an AI operating system for business operations: dark,
focused, technical, and calm. The interface uses low-contrast panels, dense
navigation, operational status cues, and a strong green signal color for
actions, live agents, and healthy state.

## Tokens

Colors:

- Background: `#0d0f0f`
- Sidebar: `#101212`
- Panel: `#151716`
- Elevated panel: `#1c1e1d`
- Border: `#242a27`
- Text: `#ebecea`
- Muted text: `#a5ada7`
- Primary green: `#4ee3a3`
- Accent green: `#24c78b`
- Warning: `#f2c94c`
- Danger: `#ff6b6b`

Typography:

- Primary font: Geist Sans.
- Mono/data font: Geist Mono.
- Page titles use 36-40px, 650-700 weight, tight but not negative tracking.
- Section labels use uppercase, 12px, 0.08em tracking.
- Operational metadata uses 12-13px and muted text.

Shape and spacing:

- Cards and controls use 8px radius.
- Icon tiles use 8-12px radius depending on size.
- Desktop app shell uses a 256px sidebar and a dense topbar.
- Main content max width should stay around 1120px for dashboards.

## Components

Sidebar:

- Dark fixed column.
- Active item uses translucent green fill and a left rail or strong icon color.
- Bottom primary action is always visible on desktop.

Topbar:

- Search is the dominant control.
- Utility icons are compact square buttons.
- User identity stays on the far right.

Cards:

- Use `bg-panel`, `border-panel-border`, and subtle dark shadow.
- Analytics or hero cards may use `os-panel-glow`.
- Avoid nested cards except repeated list items inside a larger dashboard card.

Buttons:

- Primary: green fill, dark text, used for creation and AI actions.
- Secondary: elevated dark surface, neutral text.
- Ghost: sidebar/topbar icon actions.
- Danger: abort/destructive actions.

Status:

- Healthy/active: green dot or green badge.
- Processing: green text plus progress line.
- Pending/idle: muted gray.
- Confidential/risk: danger token.

## Product Voice

Default UI copy remains Portuguese for the Brazilian SMB audience. Labels should
be short, operational, and action-oriented: `Criar assistente`, `Revisar fusao`,
`Convidar membro`, `Abrir historico`.
