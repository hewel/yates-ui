# Yates UI

Yates UI presents monitor-specific workspace navigation and system status for the Niri desktop.

## Language

**Output**:
A display destination identified by its compositor connector. Each active Output owns one Bar.
_Avoid_: Monitor, screen

**Bar**:
The persistent surface for an Output that presents workspace navigation, time, and system status.
_Avoid_: Panel, dock

**Workspace Popup**:
A transient surface for a populated workspace that presents its windows while the pointer moves between the workspace control and the surface.
_Avoid_: Workspace preview, tooltip

## UI Interaction Baseline

### Predictive hover navigation

Hover-triggered navigation that places sibling triggers beside a transient surface must preserve the
current selection while the pointer trajectory remains inside a prediction cone aimed at that surface.

- Entering a sibling trigger inside the cone defers selection instead of replacing the open surface.
- Leaving the cone selects the hovered sibling immediately.
- A paused pointer may defer selection for at most 300 ms.
- Crossing between separate surfaces uses a short 200 ms hide grace; the grace is a seam fallback, not
  a replacement for pointer-intent detection.
- Explicit activation remains immediate and must not depend on pointer history; the current popup uses
  click activation.
- Pointer-intent geometry stays in a pure module with deterministic tests; GTK adapters only report
  motion and surface placement.
