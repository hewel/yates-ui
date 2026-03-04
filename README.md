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
```

## Project Structure

```
yates-ui/
├── src/
│   ├── app.tsx          # Main AGS application entry
│   ├── app.css.ts       # Global styles with vanilla-extract
│   ├── widget/
│   │   ├── Bar.tsx      # Status bar component
│   │   ├── Bar.css.ts   # Bar-specific styles
│   │   └── bar/         # Bar sub-components
│   │       ├── state.ts # State management via AGS connections
│   │       └── types.ts # TypeScript type definitions
│   └── lib/
│       ├── NiriClient.ts # Niri IPC client
│       └── niri.ts       # Niri service integration
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

## License

MIT © [hewel](https://github.com/hewel)

---

<p align="center">Built with ❤️ for the Niri community</p>
