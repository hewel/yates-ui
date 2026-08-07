# yates-ui

A sleek, modern status bar for [Niri](https://github.com/YaLTeR/niri) Wayland compositor, built with [AGS (Aylur's GTK Shell)](https://github.com/Aylur/ags).

## Features

- **Real-time Niri integration** - Track workspaces, windows, and keyboard layouts
- **Smooth animations** - CSS-powered transitions and state-based updates
- **Type-safe** - Built with TypeScript and Effect for robust error handling
- **Modern build pipeline** - Rolldown for fast bundling with vanilla-extract CSS

## Requirements

- [Bun](https://bun.sh/) v1.3.9+
- [Niri](https://github.com/YaLTeR/niri) compositor
- [AGS](https://github.com/Aylur/ags) GTK Shell
- `flock` from util-linux for single-owner watch and live-test processes

## Installation

```bash
# Install dependencies
bun install

# Generate AGS type definitions
ags types -u -d ./
```

## Development

```bash
# Start development mode with hot reload
bun run start

# Build for production
bun run build

# Deterministic unit/contract tests
bun test

# Isolated D-Bus + nested Niri acceptance
bun run acceptance:nested

# Live persistent-pointer smoke test (aborts on DMS/competing layers)
bun run acceptance:live
```

## Project Structure

```
yates-ui/
├── src/
│   ├── runtime.ts       # GJS compatibility entrypoint
│   ├── app.ts           # GTK application and per-output lifecycle
│   ├── app.css.ts       # Global styles with vanilla-extract
│   ├── debug/           # Structured stderr and test-only D-Bus control
│   ├── niri/            # Decoded Niri JSON IPC state
│   ├── services/        # Live and deterministic bar dependencies
│   ├── widget/
│   │   ├── Bar.tsx      # Status bar component
│   │   ├── Bar.css.ts   # Bar-specific styles
│   │   └── popupController.ts
│   └── windowRegistry.ts # Idempotent per-output ownership
├── scripts/acceptance/  # Nested compositor orchestrator and artifacts
├── scripts/live-acceptance/ # Persistent uinput pointer and live preflight
├── tests/               # Bun contract and protocol tests
├── @girs/               # Generated GTK type definitions
├── package.json
└── rolldown.config.ts   # Build configuration
```

## Key Technologies

- **[AGS](https://github.com/Aylur/ags)** - GTK4-based widget system for Wayland
- **[vanilla-extract](https://vanilla-extract.style/)** - Type-safe CSS-in-JS with zero runtime
- **[Effect](https://effect.website/)** - Powerful effect system for TypeScript
- **[Rolldown](https://rolldown.rs/)** - Fast Rust-based bundler
- **[Niri](https://github.com/YaLTeR/niri)** - Scrollable-tiling Wayland compositor

## Debugging contract

Debug runs correlate three evidence channels: the app's test-only session D-Bus snapshot, Niri JSON IPC/layer state, and `grim -c` pixels. GJS diagnostics are JSONL on stderr. Acceptance artifacts are written to `/tmp/yates-ui-acceptance/<run-id>/`; generated images and logs are not committed.

## License

MIT © [hewel](https://github.com/hewel)

---

<p align="center">Built with ❤️ for the Niri community</p>
