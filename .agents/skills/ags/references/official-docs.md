# Official Astal and Gnim references

Use these sources as the authority for API and JSX behavior. Browse them when current or library-specific details matter; do not rely on remembered AGS v1 patterns.

## Astal library APIs

- Reference index: https://aylur.github.io/astal/guide/libraries/references
- The index links the maintained APIs for Apps, Auth, Battery, Bluetooth, Brightness, Cava, Greet, Hyprland, Mpris, Network, Notifd, PowerProfiles, Quarrel, River, Tray, and WirePlumber.
- The library references are annotated for C. For TypeScript/GJS code, cross-check the linked GJS references and the repository's generated GI declarations for casing, nullable values, constructors, properties, signals, and enum representation.

Consult this index whenever adding or changing an Astal service integration. Open only the library page relevant to the task.

## Gnim JSX and reactivity

- JSX reference: https://aylur.github.io/gnim/jsx

Consult the relevant section for:

- JSX expression types and the `jsx` function
- class components, `$constructor`, `$type`, signals, `$`, bindings, and CSS classes
- function-component props, children, and `FCProps`
- `<With>`, `<For>`, fragments, and child ordering
- `Accessor`, `createState`, `createComputed`, `createBinding`, `createEffect`, `createConnection`, `createMemo`, `createSettings`, and `createExternal`
- scopes, `createRoot`, `getScope`, `onCleanup`, `onMount`, and contexts
- explicit registration of intrinsic elements

Key boundary: Gnim JSX is syntactic sugar for constructing GObjects. It does not use React reconciliation, hooks, or component rerenders.
