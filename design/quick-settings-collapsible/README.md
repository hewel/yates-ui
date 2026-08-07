# Collapsible Quick Settings/Notifications

> Source: `source.png` (this directory) · 1200×1290 · generated 2026-08-08 by the `ui-doc`/`ui-slice` agent pipeline

## Overview

Design spec for a single-entry-point desktop shell panel that merges quick settings and notifications into one collapsible surface. Only one of the two groups is expanded at any given time — expanding one collapses the other. The spec shows the two states side by side as dark-theme panel variants: the left panel is the default state with **Quick Settings expanded** (sliders, toggle grid, full MPRIS media player, and a collapsed notifications preview), and the right panel shows **Notifications expanded** (a collapsed icon-only toggle row, a compact media player, and a four-card notification list). A centered pill button in each variant ("18 More Notifications" / "Expand Settings") is the affordance that switches between the two states.

## Layout Map

```
┌────────────────────────────────────────────────────────────────┐
│  Title: "Collapsible Quick Settings/Notifications"             │
│  Description paragraph (single entry point, mutually           │
│  exclusive expansion)                                          │
│                                                                │
│  "Quick Settings expanded (default)"   "Notifications expanded"│
├──────────────────────────────┬─────────────────────────────────┤
│  LEFT PANEL (variant A)      │  RIGHT PANEL (variant B)        │
│  ┌────────────────────────┐  │  ┌───────────────────────────┐  │
│  │ status strip (black)   │  │  │ status strip (black)      │  │
│  │ [56%]  ○ ○ ○ ○        │  │  │ [56%]  ○ ○ ○ ○           │  │
│  │ ▬▬▬ volume slider   > │  │  │ ○ ○ ○ ○ ○ ○  (collapsed  │  │
│  │ ▬▬▬ brightness     > │  │  │      toggles, icon-only)   │  │
│  │ [Wi-Fi >] [Bluetooth>]│  │  │ ┌───────────────────────┐ │  │
│  │ [Power >] [NightLight]│  │  │ │ compact media player  │ │  │
│  │ [Dark   ] [Airplane  ]│  │  │ └───────────────────────┘ │  │
│  │ ┌────────────────────┐│  │  │    ( Expand Settings  > ) │  │
│  │ │ media player (full)││  │  │ ┌───────────────────────┐ │  │
│  │ │ art+title+controls ││  │  │ │ Messages  10 min    ▾ │ │  │
│  │ │ ▬▬ progress        ││  │  │ ├───────────────────────┤ │  │
│  │ └────────────────────┘│  │  │ │ Mail      1 hour    ▾ │ │  │
│  │ ┌────────────────────┐│  │  │ ├───────────────────────┤ │  │
│  │ │ Messages 10 min  ▾ ││  │  │ │ Console   2 hour      │ │  │
│  │ │ (collapsed preview)││  │  │ ├───────────────────────┤ │  │
│  │ └────────────────────┘│  │  │ │ Tootle    4 hours   ▾ │ │  │
│  │ ( 18 More Notifications>│  │ └───────────────────────┘ │  │
│  └────────────────────────┘  │  └───────────────────────────┘  │
└──────────────────────────────┴─────────────────────────────────┘
```

**Variant relationship:** both panels are the SAME component in two mutually exclusive states. Shared across variants: the status strip + battery/actions top row, and the media player (full vs. compact form). The quick-settings group and notifications group trade vertical space: expanded quick settings (left) collapses notifications to one preview card + "18 More Notifications"; expanded notifications (right) collapses quick settings to a single icon-only circle row + "Expand Settings".

## Components

### Spec Header  (`100,70 950×250`)

## SpecHeader
- **Type**: text
- **Content**: 
  - Title: "Collapsible Quick Settings/Notifications"
  - Description: "Single entry point for quick settings and notifications, where only one of the two groups is expanded at any given time. Expanding one group collapses the other."
  - Left caption: "Quick Settings expanded (default)"
  - Right caption: "Notifications expanded"
- **Layout**: Single column, vertical stacking — title (full width) → description paragraph (full width, same column) → two captions split left/right on one row with wide gutters (left caption left-aligned, right caption right-aligned or spaced to opposite side).
- **Style**: Title: large bold sans-serif, dark gray/black (`#1A1A1A`–`#2D2D2D`), ~32px+. Body paragraph: regular weight sans-serif, medium gray (`#555555`–`#666666`), ~14–16px. Captions: medium-bold sans-serif, dark (`#2D2D2D`), ~16–18px. White background (`#FFFFFF`), no borders/shadows/radius. Typography is document-heading style, not UI element styling.
- **States**: default (static documentation text, no interactivity)
- **Children**: No repeated or nested sub-elements; four distinct text blocks arranged vertically with one horizontal split row for the column captions.

### Left Panel — Top Bar  (`140,378 420×72`)

## QuickSettingsTopBar
- **Type**: input / status header
- **Content**: Battery icon followed by `56%`; four unlabeled action buttons: camera icon, gear icon, padlock icon, power icon
- **Layout**: single horizontal row (left-to-right), split layout — battery pill anchored far left, then ~equal spacing gap to four equally-spaced circular icon buttons anchored far right; items vertically centered within the strip. Top edge has a large curvature (~18–20 px border-radius) matching the panel's rounded top corners.
- **Style**: background `#2E2E2E` (dark gray). Battery pill: slightly lighter `#3A3A3A` filled capsule with large border-radius (~50 px height/width ratio). Four icon buttons: identical circles (~32–36 px diameter), `#3A3A3A` fill, separated by ~16–20 px gutters. All icons & text rendered in pure white (`#FFFFFF`). Monospace or system sans-serif font for `56%`, medium weight (~500), ~13–14 px relative size. No stroke borders.
- **States**: default — no toggle highlights, hover indicators, active fills, or disabled greying visible. All elements appear static/unselected.
- **Children**: 5 interactive sub-elements — (1) battery-status pill `[battery-outline-icon] [text-label]`, (2) camera-circle `[camera-outline-icon]`, (3) settings-circle `[gear-outline-icon]`, (4) lock-circle `[padlock-outline-icon]`, (5) power-circle `[power-outline-icon]`. All five share identical icon-size scale (~18–20 px glyphs centered in their containers).

### Left Panel — Sliders  (`140,448 420×112`)

## QuickSettingsSliders
- **Type**: input
- **Content**: `(no text)` — two icon-only rows; left icons are a white headphones symbol (volume, top row) and a white sun/brightness symbol (bottom row)
- **Layout**: Two identical full-width rows stacked vertically with ~12 px gap. Each row is a horizontal pill: left segment ≈ 55–60% width (blue fill with icon), middle ≈ 35% (dark gray track), right ≈ 8% (circular cap containing `>` chevron). Pill is fully rounded (`border-radius: 999px`).
- **Style**: Background track `#2D2D2D` (dark gray). Filled progress color `#2F81F7` / `#3B82F6` variant (vibrant blue). Icon stroke white (`#FFFFFF`), ~20 px. Right-cap background `#3A3A3A` (lighter than track), slightly inset circle, white `>` chevron inside. Overall container surface `#1E1E1E` (near-black).
- **States**: Default (not interacted). Fill proportion visible (~55–60% blue = current setting level). Top slider fill slightly larger than bottom, suggesting different value settings.
- **Children**: Each row: [headphone or brightness icon] + [blue fill bar, fully rounded] + [dark track bar] + [right circular cap with right-chevron `>`]. Chevron indicates clickable expand/toggle affordance.

### Left Panel — Toggle Grid  (`140,562 420×190`)

## QuickTogglesGrid
- **Type**: navigation/input
- **Content**: Row 1 — Wi‑Fi (subtitle: Network 1234), Bluetooth. Row 2 — Power Mode (subtitle: Balanced), Night Light. Row 3 — Dark Style, Airplane Mode
- **Layout**: 2-column × 3-row grid inside dark container (#181818). Two equal-width pills (~190px) per row with ~16px column gap, ~8-10px row gap. Each pill: [icon] [label ± subtitle in text group] [chevron right]. Subtitle stacks below label at smaller size.
- **Style**: Active: blue #2E7EE0 fill, white icon + text. Inactive: dark gray #3A3A3A fill, white icon + text (subtitle dimmed). Pill radius border-radius: 999px, height ~42px. Flat style, no borders/shadows.
- **States**: Active (blue): Wi‑Fi (chevron visible), Night Light (no extras). Inactive (gray): Bluetooth (chevron), Power Mode (chevron), Dark Style (none), Airplane Mode (none)
- **Children**: 6 pill buttons; each has [left-icon] + [text-group: bold label + optional dimmed subtitle] + [optional chevron]. Chevron present on 3 items suggesting expandable sub-menus.

### Left Panel — Media Player (Full MPRIS)  (`140,755 420×150`)

## MediaPlayerCard
- **Type**: card
- **Content**: "My Queen is Angela Davis" (bold); "Sons Of Kemet" (regular, lighter); three control icons: prev (⏮), pause (⏸), next (⏭) — no text labels on controls
- **Layout**: Column layout inside rounded-rect card. Top = row: square orange album art left + two-line text block right. Bottom = row of three playback controls (prev circle / pause pill / next circle) centered, with thin progress bar spanning full card width at bottom edge.
- **Style**: Card background #2F2F2F dark gray, large border radius ~16px. Album art: vibrant orange #E87A2D with dark line-art figures, ~56×56px square with small internal radius ~6px. Title: bold ~15px #FFFFFF. Artist: regular weight ~12px #B0B0B0 muted gray. Control buttons: dark translucent rgba(80,80,80,0.6) fill, white icon strokes. Progress track: thin #4A4A4A; active fill: solid blue #3B82F6 at ~65% from left.
- **States**: Paused state (pause glyph visible); progress at ~65% indicates playback in progress; default render state
- **Children**: 1 album art thumbnail; 2 text elements (title, artist); 3 control buttons (prev=circle ▶◁ ~32px, pause=pill ⏸ ~80px wide, next=circle ▶▷ ~32px); 1 progress bar (gray track + blue fill segment)

### Left Panel — Notifications (Collapsed)  (`140,905 420×200`)

## CollapsedNotificationCard
- **Type**: card
- **Content**: Header: "Messages" (with speech-bubble/chat icon left); "10 min" (timestamp, right); Sender: "Graciela Campos" (bold, white, large); Preview body (two-line, truncated): "Do you fancy getting lunch some place first? There's that dim sum place we've…"; Avatar: circular photo of Graciela Campos with name caption; Expand affordance: pill button "18 More Notifications >" (chevron-right)
- **Layout**: Column arrangement — header row at top of rounded card, then sender/message-body stack horizontally with avatar pinned right and centered vertically against the message body; pill expand button centered below card in separate container section
- **Style**: Card surface ~#3D3D3D (#374151-range medium-dark gray) with large border radius (~16–20px), subtle inset shadow; container bg ~#1C1C1C near-black; primary text white (#FFFFFF), semibold sans-serif; timestamp muted gray (~#A0A0A0); avatar circle ~48px diameter; pill button dark-as-container with white text and faint border/highlight edge
- **States**: Default (collapsed state). The "10 min" + chevron-down indicates tappable header; chevrons imply interactive expand affordances for both the notification group and likely the individual card
- **Children**: 1 notification preview card containing: (1) header row — icon + "Messages" | "10 min" + caret-down; (2) body — bold sender name + two-line truncated message + circular avatar; (3) separator/spacer; (4) pill button — centered dark lozenge "18 More Notifications" + caret-right

### Right Panel — Top Bar  (`668,378 422×72`)

## RightPanelTopbar
- **Type**: text / button group
- **Content**: 56%, camera icon, settings/gear icon, lock icon, power icon
- **Layout**: Single horizontal row. Battery pill on the far left. Four equally-spaced circular icon buttons clustered on the right side, balanced within the 422×72 strip.
- **Style**: Dark charcoal background (#1C1C1C). Pill and circles use a slightly lighter fill (#3A3A3A) against bg. All icons and text are white (#FFFFFF), flat design. Pill has large border radius (~36px → full pill). Circles are uniform diameter (~48px). Typography: system font, medium weight, ~14px for '56%'. No shadows.
- **States**: Default — no toggle appears active/highlighted; all icons rendered as neutral outlines/fills.
- **Children**: One battery-info pill (left): BatteryIcon + '56%' label in #3A3A3A rounded container. Four icon-only circular buttons (right): CameraButton, SettingsButton, LockButton, PowerButton — each 48×48 circle on #3A3A3A bg, white icon centered.
- **Notes**: Identical structure to the left variant's topbar — shared/identical across both variants. This slice is the very top edge of the right panel with clipped corners.

### Right Panel — Quick Toggles (Collapsed Row)  (`668,445 422×72`)

## QuickTogglesCollapsedRow

- **Type**: navigation (icon-only toggle row)
- **Content**: `(no text labels)` — six icon-only circles; icons (left→right): Wi‑Fi signal arcs, Bluetooth double‑blade symbol, speedometer/gauge, sun with small moon arc (night light), half‑moon (dark style), airplane silhouette
- **Layout**: single horizontal row, six equal circles (~52×52 px each, r≈26) spaced ~20–24 px apart, centered vertically within the 72 px tall strip; left margin ~30 px, right margin ~20 px
- **Style**: background `#1E1E2E`; active circles filled `#2F80ED` (blue) with white 20px icons; inactive circles filled `#3C3C4A` (dark gray) with white icons; no borders; perfectly round (`border-radius: 50%`)
- **States**: two active toggles visible — **Wi‑Fi** (leftmost, blue fill) and **Night Light** (fourth from left, blue fill); four inactive — Bluetooth, Power Mode, Dark Style, Airplane Mode (all dark gray fill). Active state communicated exclusively by blue circle fill, no label highlight or underline.
- **Children**: 6 identical sub-elements, each a circular button containing a centered white SVG-style icon at ~20px diameter; no secondary text or chevron indicators.

### Right Panel — Media Player (Compact)  (`668,518 422×95`)

## MediaPlayerCompact
- **Type**: card / media
- **Content**: Title: "My Queen is Angela Davis", Artist: "Sons Of Kemet". Buttons: pause (||), next (▶|). No progress bar, no previous button, no volume.
- **Layout**: Single horizontal row. Left: square album-art thumbnail (~48×48px visual). Center: two-line label stack (bold title top ~13px, regular artist bottom ~10px), vertically centered relative to art. Right: two identical-radius circular control buttons separated by ~8px gap.
- **Style**: Dark gray pill card (#2D2D2D or #333), full-width corner radius ~10–12px. Background fills entire row frame. Album art: saturated orange/amber illustration with warm tan ground. Text: title #FFFFFF bold sans-serif; artist #A8A8A8–#B0B0B0 regular. Control circles: filled #454545 backdrop, icons pure white (#FFF).
- **States**: Default. Pause glyph indicates currently playing state. No hover/active/disabled visual differentiation present.
- **Children**: 1 album-art image + 2 text elements (title line, artist line) + 2 circular button shapes (pause, next). Total 5 child elements arranged left-to-right.

### Right Panel — Expand Settings Button  (`770,608 220×50`)

## ExpandSettingsButton
- **Type**: button
- **Content**: "Expand Settings >" (white text, label left; chevron-right icon right within same pill)
- **Layout**: single row, vertical centering. Pill container ~220×50 px. Label left-aligned, chevron right-aligned — roughly equal padding on all sides inside the pill.
- **Style**: dark grey pill background #3A3A3A / #3F3F3F, full border-radius (pill/capsule shape), no visible border stroke. White text, semibold/sans-serif, ~14–16px equivalent. Chevron also white, simple > glyph. Dark charcoal page background #1E1E1E.
- **States**: default (no hover/active/disabled state visible in snapshot)
- **Children**: none — flat pill containing inline label + icon pair

### Right Panel — Notification: Messages  (`668,650 422×135`)

## NotificationCard — Messages
- **Type**: card (notification list item)
- **Content**: Header row: "💬 Messages" + "10 min" + chevron-down ▼; Body: "Graciela Campos" (bold), two-line preview "Do you fancy getting lunch some place first? There's that dim sum place we've…"; Circular avatar at right with a person photo and small text label "NOW WORKING" beneath.
- **Layout**: Column inside pill-shaped card (radius ~12px). Top header row: left-aligned group label, right-aligned timestamp+chevron. Second row: sender bold name left, avatar circle (~40×40) right-aligned. Third row: two-line message preview body text wrapping left under sender name. Card sits atop another card layer visible as a subtle shadowed edge beneath bottom border — stacked cards pattern.
- **Style**: Dark grey card background #3D3D3F, on darker panel bg #2C2C2E. Text: white for header/group name/sender/bold, light grey #A8A8AA for preview body. Avatar circular, ~40px diameter. Card has soft drop shadow and rounded corners. Timestamp/chevron small muted grey #7D7D80. Divider line between header and body faint #555558.
- **States**: default
- **Children**: Header bar (icon+label, time separator, chevron dropdown), sender identity row (avatar circle), message preview paragraph (line-wrapped, truncated with ellipsis)

### Right Panel — Notification: Mail  (`668,788 422×145`)

## MailNotificationCard
- **Type**: list item (notification card within notifications panel)
- **Content**: `Mail` · `⏒ 1 hour` · `v` · `Isabell Engel` · `Weekend Hike Hey, how's it going? I already booked the tickets for all of us…`
- **Layout**: Single row header (`Mail` icon+label left-aligned, `1 hour` + chevron-right); body row beneath with sender name bold on left, monogram avatar circle right-aligned; subject+preview text below sender name wrapping across two lines. Direction: column overall, each section row-oriented.
- **Style**: Card background `#3A3A3A` rounded rectangle with subtle outer shadow on dark `#1E1E2E` page. Header: envelope outline icon + `Mail` in medium weight, sans-serif; `1 hour` light grey lighter weight; small chevron-down dropdown arrow. Body: sender `Isabell Engel` bold ~15px dark text; subject `Weekend Hike` same bold inline; preview `Hey, how's it going? I already booked the tickets for all of us…` regular weight, truncated with ellipsis. Avatar: `#F97316` to `#EA580C` vertical gradient orange circle (~36px), white `IE` lettering center, bold condensed sans-serif ~16px.
- **States**: default — no active/hover/selected indicators visible; chevron-down implies expandable detail disclosure.
- **Children**: EnvelopeOutlineIcon + label pair; timestamp + chevron pair; avatar circle with initial text; sender text block; subject+preview text block.

### Right Panel — Notification: Console  (`668,930 422×115`)

## NotificationCardSimple
- **Type**: list / card
- **Content**: `>_ Console` (header-left), `2 hour` (header-right, timestamp), `Command Complete` (title, bold), `flatpak update -y` (body/description)
- **Layout**: Vertical column — header row (icon+label left-aligned, timestamp right-aligned at opposite end), then title on its own line (bold), then body text below (regular weight). Compact height, no avatar space.
- **Style**: Background `#4A4A4A` dark gray pill with large corner radius (~8px). Header text `#B0B0B0` medium gray; icon white/gray outline. Title `#FFFFFF` white, bold ~15px. Body `#D0D0D0` light gray, regular ~13px. Timestamp `#9E9E9E` darker gray, small. Terminal icon: outlined square with `>_-` prompt symbol.
- **States**: default
- **Children**: None repeated — single static notification row, simplified variant without avatar and without expand chevron present in other notification cards.

### Right Panel — Notification: Tootle  (`668,1042 422×150`)

## NotificationCard—Tootle
- **Type**: list item (notification card)
- **Content**: 
  - Header: `Tootle` with Mastodon-like icon + `4 hours` + chevron-down ▾
  - Sender: `Mikael Laine`
  - Preview text: `@aavery @brigitta I don't know, in my experience it's been getting better for…`
- **Layout**: horizontal row — left-aligned content area fills most width; circular avatar floated right with ~12 px gap from edge and ~8 px top-margin. Text stacked vertically: app header → sender (bold, larger) → preview line wraps to two lines with ellipsis truncation after `for`. Spacing rhythm: ~6 px between header/sender, ~6 px between sender/preview.
- **Style**: medium-dark gray `#3A3A3A` background; rounded rectangle `border-radius: 10–12px`; subtle inner glow / lighter `#444444` gradient toward bottom; `#FFFFFF` white body text, `#CCCCCC` secondary (app name), bold weight `700` on sender, regular `400` on preview at ~13px. Avatar is circular, light blue-gray `#B0C4DE`, dark silhouette fill.
- **States**: default (collapsed notification card, not expanded)
- **Children**: `(no nested children; single flat card with 4 visual regions: icon+app, timestamp+chevron, sender name, truncated preview text + avatar)`

## Design Tokens

### Colors

| Hex (approx.) | Role | Where used |
|---|---|---|
| `#1C1C1E` (reported `#181818`–`#1E1E2E`) | Panel background | Both panel bodies, behind all groups |
| `#000000` (pure black strip) | Status strip | Top black bar inside each panel variant |
| `#2D2D2F` (reported `#2C2C2E`–`#2F2F2F`) | Slider track / media card surface | Slider tracks, full media player card |
| `#3A3A3A` (reported up to `#3D3D3F`, `#454545`) | Secondary surface | Inactive toggles, icon circles, battery pill, notification cards, "Expand Settings"/"18 More Notifications" pills, compact-media control circles |
| `#4A4A4A` | Progress track / lighter card edge | Media progress track, Console card (reported lighter) |
| `#2F80ED` (reported `#2E7EE0`–`#3B82F6`) | **Accent blue** | Active toggles (Wi-Fi, Night Light), slider fills, media progress fill |
| `#FFFFFF` | Primary text & icons | All labels, icons, active-toggle content |
| `#A8A8AA`–`#B0B0B0` | Secondary text | Artist name, toggle subtitles, preview body text |
| `#7D7D80`–`#9E9E9E` | Muted text | Timestamps, chevrons in card headers |
| `#E87A2D` | Album art orange | MPRIS thumbnail (both media forms) |
| `#F97316`→`#EA580C` gradient | Monogram avatar | Mail card "IE" circle |
| `#B0C4DE` | Silhouette avatar | Tootle card avatar |
| `#FFFFFF` page / `#1A1A1A`–`#2D2D2D` text / `#555555`–`#666666` body | Spec documentation | Header section above the panels (light page, not part of the dark UI) |

**Conflicts noted (not reconciled silently):**
- **Accent blue** was reported as `#2F80ED`, `#2E7EE0`, `#2F81F7`, and `#3B82F6` across slices — almost certainly one token; treat `#2F80ED`± sampling error as canonical.
- **Panel background** was reported both as neutral near-black (`#181818`/`#1C1C1C`/`#1E1E1E`) and slightly blue-tinted (`#1E1E2E`, `#2C2C2E`). Likely one neutral dark token; the blue tint reports are probably perceptual/compression artifacts.
- **Card surface** varies between `#3A3A3A` (toggles, Mail/Tootle cards) and `#3D3D3F`/`#4A4A4A` (Messages/Console cards) — could be one token with shadow/gradient, or two elevations (base card vs. stacked card). Unclear from the raster.
- Media card surface reported as `#2F2F2F` (full) vs `#2D2D2D`/`#333` (compact) — likely the same token.

### Typography

| Style | Size/Weight/Case | Where used |
|---|---|---|
| Spec title | ~32px+, bold, sans, dark on white | "Collapsible Quick Settings/Notifications" |
| Spec body | ~14–16px, regular, gray on white | Description paragraph |
| Column caption | ~16–18px, semibold | "Quick Settings expanded (default)", "Notifications expanded" |
| Toggle label | ~14px, semibold/bold, white | Wi-Fi, Bluetooth, Night Light, … |
| Toggle subtitle | ~12px, regular, dimmed white | "Network 1234", "Balanced" |
| Battery label | ~13–14px, medium (~500) | "56%" |
| Media title | ~13–15px, bold, white | "My Queen is Angela Davis" (both forms) |
| Media artist | ~10–12px, regular, muted | "Sons Of Kemet" |
| Notification sender/title | ~15px, bold (700), white | "Graciela Campos", "Isabell Engel", "Command Complete", "Mikael Laine" |
| Notification preview | ~13px, regular (400), light gray | Message/mail/console/tootle bodies |
| App-group header | ~13px, medium, muted white | "Messages", "Mail", "Console", "Tootle" |
| Timestamp | ~11–12px, regular, muted gray | "10 min", "1 hour", "2 hour", "4 hours" |
| Pill button label | ~14–16px, semibold, white | "18 More Notifications", "Expand Settings" |

### Spacing & Shape

- **Radii:** pills/toggles/sliders fully rounded (`border-radius: 999px`); icon buttons and avatars perfect circles (50%); cards ~10–16px (media ~16px, notifications ~10–12px); panel outer corners ~18–20px; album art inner radius ~6px.
- **Grid rhythm:** toggle grid = 2 equal columns (~190px pills, ~42px tall) with ~16px column gap, ~8–10px row gap; collapsed toggle row = 6 × ~52px circles with ~20–24px gaps; sliders full-width with ~12px vertical gap.
- **Card internals:** ~6px vertical rhythm between header/sender/preview; avatars ~36–48px circles pinned right with ~12px edge gap.
- **Shadows:** flat overall; notification cards show a soft drop shadow and a stacked-second-card edge beneath (grouped/stacked notification pattern); media control buttons use translucent `rgba(80,80,80,0.6)` fills.

## Interactions & States

- **Group switching (core behavior):** "18 More Notifications ›" (left variant) and "Expand Settings ›" (right variant) pill buttons swap which group is expanded; only one group is expanded at a time.
- **Toggles:** Wi-Fi and Night Light shown **active** (blue fill) in both variants; Bluetooth, Power Mode, Dark Style, Airplane Mode inactive (dark gray). Active state = blue fill only (no other indicator in the collapsed icon row).
- **Sub-menu affordances:** chevron-right on Wi-Fi, Bluetooth, Power Mode pills (and on both slider right-caps) implies drill-down sub-menus; Dark Style and Airplane Mode have no chevron (simple on/off).
- **Notification cards:** chevron-down next to the timestamp on Messages, Mail, and Tootle implies per-card expand/collapse; the Console card notably has NO chevron (simple variant). Timestamp formats: "10 min", "1 hour", "2 hour", "4 hours".
- **Media player:** full form (left) has previous / pause / next + progress bar (~65% filled, blue); compact form (right) drops previous and the progress bar, keeping pause + next. Pause glyph shown in both (playing state).
- **Stacked cards:** the Messages card shows a second card edge beneath it, indicating grouped/stacked notifications from the same app.
- All other elements shown in default state only; no hover/pressed/disabled states depicted.

## Open Questions

- **Exact accent blue and panel background tokens** — per-slice sampling disagreed (`#2E7EE0`–`#3B82F6`; neutral vs. blue-tinted dark). Needs the source design file to resolve.
- **Card elevation model** — are notification cards one surface token with shadows, or two (base + stacked layer)? The Console card also read lighter (`#4A4A4A`) than the others; possibly a selected/hover style or just sampling variance.
- **"18 More Notifications" behavior** — does tapping it switch to the notifications-expanded variant (assumed), or open a separate full notifications view? The count (18) vs. the 4 cards shown in the expanded variant is unexplained (overflow? scrollable list?).
- **Slider right-cap chevron** — unclear whether it expands a per-device sub-menu (e.g., audio output chooser) or acts as a secondary button.
- **Status strip icons** — the black top strip's small icons (brightness, wifi, volume, battery) appear decorative (mock device frame); unclear if they're part of the component.
- **Truncated text** — all notification previews are ellipsized ("…"); full strings unknown.
- **Empty states** — no design shown for zero notifications or no media playing.
- **Left-media "paused" vs. "playing"** — one slice read the pause glyph as a paused state, the other as playing; glyph convention needs confirming.

---
Crop slices retained at `slices/` (14 PNGs, `NN-name.png` naming).
