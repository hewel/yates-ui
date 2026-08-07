---
name: ags
description: Build, modify, and review AGS desktop-shell applications using Astal libraries, GTK4, TypeScript, and Gnim JSX. Use for AGS bars, windows, popups, services, reactive widget state, GObject bindings, signals, lifecycle cleanup, or Gnim JSX correctness.
---

# AGS with Gnim

Build against the repository's installed AGS, Gnim, GTK, and generated GI types. Treat Gnim JSX as declarative GObject construction, not as React.

## Start from the project

1. Inspect `package.json`, `tsconfig.json`, nearby widgets, and generated GI declarations before choosing imports or APIs.
2. Preserve the project's GTK generation and import style. In this repository, prefer explicit `Gtk.*` components with `jsxImportSource: "gnim/gtk4"`.
3. Read [official-docs.md](references/official-docs.md) before using unfamiliar Astal libraries or advanced Gnim JSX behavior.
4. Make the smallest compatible change and run the repository's focused build or typecheck afterward.

## Write correct Gnim JSX

- Use explicit function or class components such as `<Gtk.Box>` and `<Gtk.Label>`. Do not assume lowercase intrinsic elements exist unless the project registers them.
- Return a `GObject.Object` from a function component. Remember that `JSX.Element` is the base `GObject.Object` type; use `jsx(Component, props)` or a narrow assertion when the concrete return type is required.
- Attach signals with `onSignalName` and property notifications with `onNotifyPropertyName`.
- Use `$={(self) => ...}` for post-construction setup, `$type` for `Gtk.Buildable` child type strings, and `$constructor` only when a static constructor is required. Construct-only properties cannot be set after `$constructor` runs.
- Pass class-component children only when the parent supports them through `Gtk.Buildable`. Handle function-component `children` explicitly.
- Use `FCProps` when a function component exposes the `$` setup property. Declare whether reusable props accept static values, `Accessor` values, or both.
- Prefer `class` for CSS classes. Use inline `css` only for temporary debugging.
- For top-level shell windows, verify application ownership, visibility, target monitor, and shell behavior such as anchors or exclusivity. Do not construct and then discard an unregistered `Gtk.Window`.

## Model reactivity and lifetime

- Read an `Accessor` by calling it. Use `peek()` only when intentionally avoiding dependency tracking.
- Pass an `Accessor` directly to a widget property when the property should update reactively.
- Use `createState` for writable state, `createComputed` for cached derived reads, `createMemo` when subscribers should only be notified after the derived value changes, and `createBinding` for GObject properties.
- Update state immutably. `createState` uses `Object.is` by default, so returning a mutated object with the same identity does not notify dependents.
- Prefer scope-aware primitives. If calling `subscribe()` directly, register its disposer with `onCleanup`.
- Restore the captured scope before allocating reactive resources in asynchronous callbacks.
- Use `createConnection` or `createExternal` for lazy signal/external producers whose lifetime should follow subscribers.

## Render dynamic children safely

- Prefer keeping a widget mounted and binding its `visible` property when that expresses the behavior cleanly.
- Use `<With>` for dynamic nullable/value rendering and `<For>` for dynamic iterables.
- Wrap `<With>` and `<For>` in a dedicated container. Replacement widgets are appended, so sibling order is otherwise not preserved.
- Account for GTK4 fragment removal: custom parents must provide the child insertion/removal behavior Gnim fragments expect.

## Use Astal libraries accurately

- Locate the library through the official Astal reference index, then verify names and types against the repository's generated GJS/GI declarations.
- Translate C-annotated reference names through the GObject introspection conventions actually exposed to TypeScript; do not mechanically copy C identifiers.
- Prefer `get_default()` or another documented constructor for service singletons. Bind documented GObject properties and connect documented signals instead of polling when a service already exposes updates.
- Do not invent libraries, properties, signals, or enum members. If the installed typings disagree with online documentation, follow the installed version or explain the version mismatch.

## Verify

1. Run the narrowest formatter, linter, typecheck, or build command available for the touched files.
2. Check startup/runtime behavior when the change affects window construction, monitor selection, signals, or lifecycle.
3. Confirm subscriptions and external producers are disposed when their owning scope or widget is removed.

## Debug Wayland and GJS deterministically

- Send structured diagnostic JSON to `printerr`; do not rely on buffered GJS stdout for timing-sensitive evidence.
- Establish three independent observations when debugging layer-shell UI: application state/control over test-only D-Bus, compositor state from Niri JSON IPC, and pixels from `grim -c`.
- Treat GIR array declarations as untrusted runtime boundaries. Prefer decoded Niri event-stream state when a property accessor throws, returns null, or marshals inconsistently.
- Keep synthetic input devices persistent for the entire scenario. Require heartbeat and sequence acknowledgements; a lost device is a harness failure, not an application failure.
- Detect idle overlays, exclusive zones, and competing bars before live tests. Never stop or reconfigure them without user authorization; use nested Niri for the deterministic default lane.
- Assert one application-owned layer surface per output after repeated activation and watch rebuilds. Capture stderr, layer JSON, D-Bus snapshots, input acknowledgements, screenshot metadata, and cleanup status under a run-specific artifact directory.
