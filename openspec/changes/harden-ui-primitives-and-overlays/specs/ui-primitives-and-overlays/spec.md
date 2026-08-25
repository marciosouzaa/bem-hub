## Purpose

Defines the workspace UI behavior expected from shared primitives, overlays,
and component boundaries so daily screens remain robust, accessible, and
consistent as the product grows.

## ADDED Requirements

### Requirement: Overlays preserve visual priority
The system SHALL render operational menus, popovers, dialogs, drawers, and
future toasts above the app shell layer that triggered them. Global toasts SHALL
render above modal surfaces.

#### Scenario: User menu opens from topbar
- **WHEN** the user opens the workspace user menu from the topbar
- **THEN** the menu is fully visible above the topbar and neighboring controls

#### Scenario: Row action menu opens in constrained panel
- **WHEN** a row action menu opens inside a scrolling table, inbox, or side panel
- **THEN** the menu is not clipped by the local container and remains usable

### Requirement: Overlay interactions are accessible
The system SHALL provide keyboard and focus behavior for interactive overlays.

#### Scenario: Keyboard dismisses menu
- **WHEN** a dropdown menu is open and the user presses Escape
- **THEN** the menu closes and focus returns to the trigger

#### Scenario: Dialog keeps focus contained
- **WHEN** a modal dialog or drawer is open
- **THEN** keyboard focus remains inside it until the user closes or completes it

### Requirement: Shared primitives own generic UI states
The system SHALL use shared primitives for common UI states and controls instead
of one-off HTML for equivalent behavior.

#### Scenario: Confirmation is required
- **WHEN** a destructive or irreversible UI action needs confirmation
- **THEN** the application uses the shared confirmation pattern rather than a
  browser-native confirmation prompt

#### Scenario: Feedback is shown
- **WHEN** a workflow reports success, warning, error, or informational feedback
- **THEN** the feedback has consistent semantic text, color, border, and
  accessible status behavior

### Requirement: Component boundaries stay readable
The system SHALL split client components by product responsibility when a file
accumulates unrelated UI state, rendering branches, or repeated view sections.

#### Scenario: Workspace component grows beyond budget
- **WHEN** a client workspace component becomes large enough to hide distinct
  responsibilities such as toolbar, filters, list, composer, viewer, and empty
  state
- **THEN** those responsibilities are extracted into named components or hooks
  without moving server-side authorization or tenant rules into UI primitives

### Requirement: App primitives remain domain-neutral
The system SHALL keep shared UI primitives free of tenant, billing, permission,
and external provider business rules.

#### Scenario: Domain action uses shared menu
- **WHEN** a domain component renders row actions or message actions through a
  shared menu primitive
- **THEN** the domain component supplies action availability and handlers, while
  the primitive only manages presentation and interaction behavior
