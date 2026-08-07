# Repository Guidelines

## Project Structure & Module Organization

Application startup and GTK application ownership live in `src/app.ts`. Place reusable widgets in `src/widget/` and keep their vanilla-extract styles beside them as `Component.css.ts`. Shared TypeScript declarations belong in `src/types/`. Rolldown integration code lives in `plugins/`; keep build-specific behavior out of UI components. `@girs/` contains generated GI declarations and `dist/` contains generated bundles; both are ignored and must not be edited by hand. Repository-specific agent guidance lives under `.agents/skills/`.

## Build, Test, and Development Commands

- `bun install` installs the locked dependencies from `bun.lock`.
- `ags types -u -d ./` regenerates local GObject Introspection declarations.
- `bun run start` watches `src/`, rebuilds, and restarts the bundled GJS application.
- `bun run build` creates the production bundle in `dist/`.
- `bun test` runs the deterministic Niri replay, popup, registry, and input-protocol tests.
- `bun run acceptance:nested` runs the isolated D-Bus + nested Niri acceptance lane.
- `bun run acceptance:live` runs the pointer-driven live smoke lane; preflight aborts on DMS or competing layers.
- `bunx oxfmt --check .` checks formatting without rewriting files.
- `bunx oxlint .` runs TypeScript and JavaScript lint checks.

## Coding Style & Naming Conventions

Use strict TypeScript, Gnim GTK4 JSX, two-space indentation, and no semicolons. Let `.oxfmtrc.json` control import ordering, especially `gi://`, Gnim, external, and relative imports. Name widget components and files in PascalCase (`Bar.tsx`); use camelCase for helpers, state, and exported style tokens. Prefer explicit `Gtk.*` elements and verify Astal properties and signals against the generated declarations.

## Testing Guidelines

Use Bun tests in `tests/` and name files `*.test.ts`. Before submitting changes, run `bun test`, formatting, linting, and `bun run build`. Window, monitor, popup, or layer-shell changes also require `bun run acceptance:nested`. Run the live lane only in a clean session; it intentionally refuses to alter DMS, DPMS, or competing bars.

## Commit & Pull Request Guidelines

Follow the repository's Conventional Commit history: `feat(bar): ...`, `fix(build): ...`, or `docs(skill): ...`. Keep commits focused. Pull requests should explain behavior changes, list validation performed, link relevant issues, and include screenshots for visible bar or styling updates.

## Agent-Specific Instructions

Consult `.agents/skills/ags/` for AGS/Gnim work and `.agents/skills/gtk-vanilla-extract/` for GTK styling. Preserve unrelated local edits and prefer focused validation over broad rewrites.

For runtime diagnostics, use structured `printerr` JSONL; GJS stdout may buffer. Read workspaces/windows through the decoded Niri JSON event stream in `src/niri/`, never through unreliable GI array accessors. Use the test-only D-Bus control surface and artifacts under `/tmp/yates-ui-acceptance/` to distinguish app, environment, and harness failures.
