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
