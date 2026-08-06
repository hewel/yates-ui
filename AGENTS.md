# Repository Guidelines

## Project Structure & Module Organization

Application startup and GTK application ownership live in `src/app.ts`. Place reusable widgets in `src/widget/` and keep their vanilla-extract styles beside them as `Component.css.ts`. Shared TypeScript declarations belong in `src/types/`. Rolldown integration code lives in `plugins/`; keep build-specific behavior out of UI components. `@girs/` contains generated GI declarations and `dist/` contains generated bundles; both are ignored and must not be edited by hand. Repository-specific agent guidance lives under `.agents/skills/`.

## Build, Test, and Development Commands

- `bun install` installs the locked dependencies from `bun.lock`.
- `ags types -u -d ./` regenerates local GObject Introspection declarations.
- `bun run start` watches `src/`, rebuilds, and restarts the bundled GJS application.
- `bun run build` creates the production bundle in `dist/`.
- `bunx oxfmt --check .` checks formatting without rewriting files.
- `bunx oxlint .` runs TypeScript and JavaScript lint checks.

## Coding Style & Naming Conventions

Use strict TypeScript, Gnim GTK4 JSX, two-space indentation, and no semicolons. Let `.oxfmtrc.json` control import ordering, especially `gi://`, Gnim, external, and relative imports. Name widget components and files in PascalCase (`Bar.tsx`); use camelCase for helpers, state, and exported style tokens. Prefer explicit `Gtk.*` elements and verify Astal properties and signals against the generated declarations.

## Testing Guidelines

No automated test runner is configured yet. Before submitting changes, run formatting, linting, and `bun run build`. For window, monitor, Astal service, or CSS changes, also launch under Niri/Wayland and verify the visible bar behavior. If adding tests, use colocated `*.test.ts` or `*.test.tsx` files and add the corresponding Bun script in the same change.

## Commit & Pull Request Guidelines

Follow the repository's Conventional Commit history: `feat(bar): ...`, `fix(build): ...`, or `docs(skill): ...`. Keep commits focused. Pull requests should explain behavior changes, list validation performed, link relevant issues, and include screenshots for visible bar or styling updates.

## Agent-Specific Instructions

Consult `.agents/skills/ags/` for AGS/Gnim work and `.agents/skills/gtk-vanilla-extract/` for GTK styling. Preserve unrelated local edits and prefer focused validation over broad rewrites.
