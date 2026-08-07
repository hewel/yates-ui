# Calendar Menu Concept — UI Splits

Source: `source.png` (1281×2320) and `source.svg` (Inkscape vector original), split into 7 pure-UI panel crops.
All annotation text (title, labels, behavior notes) was extracted via the project `ocr` agent (`bailian-token-plan/qwen3.6-flash`) and is preserved verbatim in [Raw OCR Output](#raw-ocr-output).

## Concept (from the spec header)

An experimental concept for the system calendar popover, **without notifications**. The core idea: the popover layout should gracefully scale depending on its content. One open question is how the contents would be configured — inline, automatic depending on app usage, or via settings.

## Behavior Rules (from the spec notes)

- Popover height is determined by the calendar and clock elements.
- The events list only includes upcoming events for the current day, and scrolls if the height exceeds the available height.
- **Clocks list scaling**: more than 4 clocks → compact layout; above 6 → paging.

---

## panels/ — Popover Layout Variants (7)

| File | What it represents |
|---|---|
| `no-weather-no-events-no-clocks.png` | Minimal popover: month calendar only (May 2021, 16th highlighted), no extra sections |
| `clocks-only.png` | Calendar + 4 world clocks with large analog icons (Boston 05:55, London 06:55, Rio de Janeiro 07:55, Berlin 09:55) — tallest narrow variant |
| `clocks-and-weather.png` | Calendar + 4 clocks + weather footer (Mostly sunny, 22°/12°) |
| `events-weather-and-clocks.png` | Full wide two-column layout — left: date header (Friday, 16 May 2026), weather, events list (14:00 Expandables with Jon → 19:30 Yoga); right: calendar + 3 clocks |
| `weather-and-events.png` | Wide two-column layout without clocks — left: date header, weather, events list; right: calendar |
| `clocks-compact.png` | Clocks scaling, >4 clocks: compact rows (small icon left, city name, time right-aligned) — 6 entries |
| `clocks-paged.png` | Clocks scaling, >6 clocks: compact rows + paging dots (● ○) below the list |

## Source Files

- `source.svg` — Inkscape 1.4.4 vector original (viewBox 338.97×613.83 mm, Adwaita Sans typography, panel colors `#282828`/`#353535`, accent `#1c71d8`). Useful for exact metrics and theme tokens.
- `source.png` — 90 DPI export used for the crops above.

---

## Raw OCR Output

Verbatim text extracted from the source image, per region.

### Header region

```text
Calendar menu concept

This is an experimental concept for the system calendar popover, without the notifications. The core idea
is that the popover layout should gracefully scale depending on its content.

One open question is how you'd configure the contents: would it be inline, automatic depending on app
usage, or configured via settings?

No weather, no events, no clocks    Clocks only    Clocks and weather
```

### Row 2 labels

```text
Events, weather, and clocks
Weather and events
```

### Behavior notes

```text
Popover height is determined by the calendar and clock elements. Events list only includes upcoming events for the current day. Events list will scroll if the height exceeds the available height.

Clocks list scaling

When there's more than 4 clocks, the list uses a compact layout:

When the number increases above 6, we start paging them:
```

---

## Reproduction

```bash
# UI crops: pixel-level dark-panel boundary detection on source.png
# (panel backgrounds #282828/#353535 on white; coordinates hard-coded per source layout)

# Text extraction: project-scoped ocr subagent (bailian-token-plan/qwen3.6-flash)
await agent("Extract all text from this image: <path>", { agent: "ocr" })
```
