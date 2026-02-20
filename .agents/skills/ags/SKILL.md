---
name: ags-widget-coder
description: Create and modify AGS (Astal Gnim) widgets for Wayland Desktop Shells using Gtk4.
license: MIT
compatibility: opencode
---

## What I do
- Build desktop shell components (bars, docks, popups, control centers) using the AGS framework.
- Write valid Gnim JSX syntax, correctly instantiating GObject and Gtk4 UI elements.
- Manage widget state using AGS accessor primitives rather than web framework hooks.

## When to use me
Use this skill whenever the user requests the creation, styling, or modification of UI components within an AGS configuration environment. 

## Core Principles & Gnim JSX Rules

### 1. JSX Architecture
- Gnim JSX is not React. It is purely syntactic sugar for declarative `GObject.Object` construction.
- Lowercase tags (e.g., `<box>`, `<label>`, `<window>`) represent builtin intrinsic Gtk/Astal widgets.
- Capitalized tags represent custom function or class widgets.
- Signal handlers are attached using the `on` prefix (e.g., `onClicked`, `onNotifyChildRevealed`).

### 2. State Management 
- **`createState(initialValue)`**: Returns an `[Accessor, Setter]` array for writable reactive values.
- **`createComputed(() => value)`**: Derives reactive values based on other accessors.
- **`createBinding(gobject, "property")`**: Creates an Accessor hooked directly into a `GObject.Object` property.
- **Reading state**: Always read state by calling the accessor as a function, e.g., `count()`.

### 3. Layout & Control Flow
- Use `<For each={list}>` to render dynamic arrays.
- Use `<With value={item}>` for conditional rendering or unwrapping nullable objects.
- **Critical Constraint**: Always wrap `<For>` and `<With>` in a container widget (like `<box>`). When items change, previous widgets are removed and new ones are appended, meaning the visual order is not preserved natively by the container.

### 4. Gtk4 Specifics
- `<window>` widgets are invisible by default in Gtk4; you must explicitly apply the `visible` attribute.
- Window instances should be added to the application singleton via the `application={app}` property or the `$={self => app.add_window(self)}` setup function.

## Example Implementation

```tsx
import app from "astal/gtk4/app"
import Gtk from "gi://Gtk?version=4.0"
import Astal from "gi://Astal?version=4.0"
import { createState, createComputed, createBinding } from "gnim"

function ClickCounter() {
    // Initialize writable state
    const [counter, setCounter] = createState(0)
    
    // Derive string via computed state
    const label = createComputed(() => `Clicked ${counter()} times`)

    return (
        <box orientation={Gtk.Orientation.VERTICAL}>
            <label label={label} />
            <button onClicked={() => setCounter((c) => c + 1)}>
                <label label="Increment" />
            </button>
        </box>
    )
}

export function Bar(monitor = 0) {
    return (
        <window
            name="Bar"
            visible
            monitor={monitor}
            application={app}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
        >
            <centerbox>
                <box $type="start" />
                <ClickCounter $type="center" />
                <box $type="end" />
            </centerbox>
        </window>
    )
}
```