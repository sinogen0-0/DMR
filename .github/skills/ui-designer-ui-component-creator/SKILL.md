---
name: ui-designer-ui-component-creator
description: 'Use when designing or restyling interfaces, creating UI components, tightening layout spacing, improving visual hierarchy, or building bold frontend screens with a clear aesthetic direction.'
argument-hint: '[screen or component]'
user-invocable: true
disable-model-invocation: false
---

# UI Designer & UI Component Creator

Use this skill when a user wants a screen, component, or interaction restyled or rebuilt with stronger visual intent. It is especially useful for compact device-like interfaces, control panels, dashboards, and other UI work where spacing, hierarchy, and component behavior all matter together.

## Workflow

1. Start from the most concrete anchor available: the target screen, component, failing layout, or nearby implementation file.
2. Inspect the existing structure before editing. Identify what controls behavior, what only forwards state, and what is safe to reshape visually.
3. Preserve functionality first. If a control changes appearance, keep its state handling, navigation, and accessibility behavior intact.
4. Define a single visual direction early. Pick a consistent palette, surface treatment, and button language instead of mixing styles.
5. Reduce vertical waste before adding new elements. Tighten padding, collapse redundant rows, and combine related visual signals into one view when possible.
6. Build the UI from reusable pieces where helpful. Prefer a small component API over duplicated markup when the same pattern appears multiple times.
7. Make physical controls feel physical. Use bevels, inset/outset shadows, edge highlights, and clear pressed or active states for hardware-inspired interfaces.
8. Keep text readable and purposeful. Use strong labels, concise status copy, and clear hierarchy for primary versus secondary actions.
9. Validate the touched slice with the cheapest useful check available: compile, typecheck, lint, or a narrow UI verification.
10. If the result still feels cramped or ambiguous, iterate on spacing, contrast, or sizing before widening scope.

## Design Criteria

- The interface should feel intentional, not generic.
- Controls should have obvious affordances and visible active states.
- The layout should use space efficiently, especially vertically.
- Related signals should be grouped into one panel when that reduces scanning cost.
- Reusable UI should stay consistent across the screen and across similar screens.
- The final result should match the product mood, not just the default design system.

## Implementation Checks

- Primary actions remain easy to find and operate.
- Button sizes, margins, and panel heights are reduced where possible without hurting usability.
- State changes are reflected visually and functionally.
- Screen content still fits the target viewport without unnecessary scrolling.
- The component compiles cleanly after the change.

## Good Prompts

- "Restyle this screen to feel like a mechanical 90s device."
- "Create a compact component with stronger visual hierarchy."
- "Combine these two indicators into one control panel."
- "Make this button cluster feel like physical hardware."
- "Reduce vertical space without changing the behavior."
