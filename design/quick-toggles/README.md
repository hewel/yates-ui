# Quick Toggles

> Source: `source.png` (this directory) · 2300×1260 · generated 2026-08-08 by the `ui-doc`/`ui-slice` agent pipeline
>
> Related: [../quick-settings-collapsible/](../quick-settings-collapsible/README.md) — the later collapsible Quick Settings/Notifications spec that evolved from this concept.

## Overview

A design-spec sheet proposing a GNOME Shell 40-era quick-settings panel ("Quick Toggles") that merges a quick-toggle grid with the notification list into a single dark, rounded panel anchored under the right end of the top bar. The left two-thirds of the sheet shows the full desktop mockup — top bar, wallpaper with app windows (context only), and the open panel containing a battery/session header, a 2×4 toggle grid, volume/brightness sliders, a media-player card, and two collapsed notification-group cards (Messages, Mail). The right third is a detached detail view of the same notification system: an expanded "Mail" group with per-notification action buttons (Mark Read / Archive), collapsed sibling cards with "…" stack indicators, and faded cards above and below conveying stack depth. This design is a companion to the earlier "Collapsible Quick Settings/Notifications" spec: the toggle grid, media-player card, and notification-group cards (sender/subject/preview + "N more notifications" footer) are carried over from that lineage.

## Layout Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Quick Toggles                                                            │  Spec header
│ An attempt at combining older quick toggles concepts …                   │
├──────────────────────────────────────────────┬───────────────────────────┤
│ [Activities  ◔ App Name        12:37   ⬤◔…▮] │ [status icons ⬤…▮] (fade) │  Top bars
│ ┌────────── desktop wallpaper ─────────────┐ │ ┌─ faded Messages card ─┐ │
│ │   (app windows — context, not sliced)    │ │ │  "4 more notifications"│ │
│ │                    ┌── quick panel ──────┤ │ ├────────────────────────┤ │
│ │                    │ avatar [56% pill] ⚙🔒⏻│ │ │ Mail              (▼▲)│ │  Group header
│ │                    │ ◯ ◯ ◯ ◯   (toggles)  │ │ │ ┌─ Mail · 1 hour ago ┐│ │
│ │                    │ ◯ ◯ ◯ ◯              │ │ │ │ Isabell Engel   (IE)│ │  Expanded card
│ │                    │ 🔊 ────●───          │ │ │ │ Mark Read | Archive││ │
│ │                    │ ☀ ───────●─          │ │ │ └────────────────────┘│ │
│ │                    │ ♪ My Queen is…  ⏸ ⏭ │ │ │ ┌─ Mikael Laine    … ┐│ │
│ │                    │ ✉ Messages · 10m ago │ │ │ ├─ Graciela Campos … ┤│  Collapsed siblings
│ │                    │ ✉ Mail · 1 hour ago  │ │ │ ├─ faded Mail card ──┤│  Stack bottom (clipped)
│ │                    └──────────────────────┤ │ └────────────────────────┘ │
│ └──────────────────────────────────────────┘ │   detached expanded stack  │
└──────────────────────────────────────────────┴───────────────────────────┘
        left ~2/3: desktop + quick panel            right ~1/3: detail view
```

## Components

### Spec Header  (`70,70 750×160`)

- **Type**: text
- **Content**:
  - title: "Quick Toggles"
  - subtitle: "An attempt at combining older quick toggles concepts with notifications and Shell 40 visuals."
- **Layout**: Vertical column, left-aligned. Title on top row; description below with ~2x title-height spacing. Same left margin.
- **Style**:
  - title: ~36-40px eq., extra-bold, sans-serif, #2D2D2D, sentence-case
  - subtitle: ~14-15px eq., regular weight, same family, #3D3D3D, sentence case
  - background: #FFFFFF
- **States**: static/non-interactive
- **Children**: Two text lines stacked: H1-equivalent title + subtitle paragraph

### Top Bar — Left  (`80,255 900×55`)

- **Type**: navigation / header bar
- **Content**: `Activities`, `App Name`, `12:37`
- **Layout**: single horizontal row (direction: row), three groups — left group (`Activities` + icon + `App Name` left-aligned to bar edge), center/right group (`12:37` right-aligned near the right edge), large invisible spacer pushing the clock right. Items ordered L→R: "Activities" → spacer → circular icon → "App Name" → spacer (dominant) → "12:37".
- **Style**: solid black background (`#000000`), white text/icons (`#FFFFFF`), font is clean sans-serif (Noto Sans / system default GNOME typeface), medium weight (~500), ~13–14 pt equivalent. No borders, radius, or shadows. Minimal vertical padding (~10–12 px inside the 55 px tall bar).
- **States**: default (no hover/active/disabled states visible)
- **Children**: `(no sub-elements; flat row)`

### Top Bar — Status Icon Cluster  (`980,255 575×55`)

- **Type**: navigation
- **Content**: `(no text)` — all glyphs only
- **Layout**: horizontal row of 6 status icons inside a dark-grey rounded-pill container (`~#2A2A2A`, corner-radius ~27px) floating on the black top-bar strip; icons are evenly spaced (~8–10 px gaps), each icon occupies roughly 22×22 px; vertically centered within the ~28 px tall pill
- **Style**: All icons rendered at 20–22 px; default foreground is white `#FFFFFF` except where muted/alerted. Background of pill: `#333333` (dark grey). Top-bar behind pill: `#0A0A0A` (near-black).
- **States**: Left-to-right, active/muted indicators:
  1. **Notification bell** — white bell glyph; small solid blue dot badge (`#4A9EFF`) at upper-right of bell curve indicating unread count (no number shown)
  2. **Power-off / lock** — red/salmon fill (`#E05555`); square button with upward-pointing open-arrow (exit/logout symbol), suggesting active or highlighted action
  3. **Microphone** — red/salmon fill (`#E05555`); full mic glyph — muted or recording state
  4. **Wi-Fi** — white signal arcs + dot; 3–4 arcs visible, strong signal indicator
  5. **Volume/Speaker** — white speaker cone + curved wave arcs (volume medium-high); no mute slash visible
  6. **Battery** — white battery-outline with green fill (`#44CC44`) inside (~80% charge); small lightning-bolt inset in lower-right of battery body indicating charging state
- **Children**: None — flat single-level icon strip.

*(The right-side mockup repeats this cluster; its slice reported the same six icons with the same red/blue/green state accents, plus a black-to-transparent gradient fade over ~40px at the left edge where the detached-stack illustration begins.)*

### Panel Header (avatar · battery pill · session buttons)  (`1060,320 490×60`)

- **Type**: navigation
- **Content**: `56% - 1:54 until full`
- **Layout**: horizontal row; left-aligned group (avatar circle → battery pill) occupying the left half, evenly-spaced gap, then three round buttons right-aligned. Elements stretched across full-width 490px.
- **Style**: dark charcoal background (`#1E1E1E`); battery pill & round buttons in lighter dark card (`#363636`); all icons/text in white; battery icon includes a green (`#2ECC71`) charge-fill accent; typography: ~14px sans-serif, title-case weight; avatar is grayscale photo within a tight circle.
- **States**: default — no toggles pressed, no hover indicators visible.
- **Children**:
  1. Circular user avatar thumbnail (grayscale portrait, person silhouette profile)
  2. Battery-status pill: battery-outline icon with green fill + label `56% - 1:54 until full`
  3. Round gear/settings button
  4. Round lock button
  5. Round power button (slightly darker background than gear/lock, possibly subtle pressed/deeper state)

### Quick-Toggle Grid  (`1060,395 490×190`)

- **Type**: navigation
- **Content**: Row 1: MyWifi, Bluetooth, Do Not Disturb, Night Light. Row 2: Dark Mode, Keyboard, Screen Sharing, Microphone
- **Layout**: 2×4 grid (2 rows × 4 columns). Each cell vertically stacked: circular icon above truncated label text. Cells evenly spaced with equal horizontal gutters (~70 px apart) and vertical gap (~50 px between rows). Full width of slice (~490 px) filled by 4 columns.
- **Style**: Background #1E1E1E dark grey card with ~16 px corner radius. Inactive icon circles on #C8C8C8 (light grey/white) fill; Screen Sharing & Microphone circles on #E54C4C (vibrant red); Dark Mode, Night Light & Do Not Disturb circles on #9A9A9A (darker grey, suggesting dim-active). Icons white/light. Labels: sans-serif, ~14 px, title case, #D0D0D0 (light grey-white). Caret ▼ to the right of every label (dark grey #808080).
- **States**: Screen Sharing — active/red. Microphone — active/red. Do Not Disturb, Night Light, Dark Mode — darker circles (dim-active or pressed). MyWifi, Bluetooth, Keyboard — default/off (light grey circle).
- **Children**: 8 toggle items arranged in 2 rows of 4. Each item = 1 circular icon + 1 text label + optional dropdown caret. Caret present on all 8: MyWifi, Bluetooth, Do Not Disturb, Night Light, Keyboard, Screen Sharing, Microphone (note: 'Dark Mode' label lacks visible caret; rest have ▼).

*(Shared lineage: this grid is the "older quick toggles concepts" element referenced in the spec subtitle, restyled to Shell 40 visuals.)*

### Sliders (volume · brightness)  (`1060,575 490×90`)

- **Type**: input
- **Content**: (no text labels visible — only icons)
- **Layout**: Two rows in column direction, each a row layout: [icon] [blue track segment] [handle] [grey untracked segment]. Icons are speaker (volume, top row) and sun/gear (brightness, bottom row). Track length ~543 px each; vertical gap between rows ~37 px. Handles sit flush at the end of the blue fill, not centered on it.
- **Style**: Background #1E1E1E (dark panel). Icon color #D4D4D4 (light grey). Track unfilled: #555555. Track filled: #5B9BF2 (GNOME-style blue). Handle: round circle, #E8E8E8 with subtle shadow/drop-shadow. No text — pure icon-driven.
- **States**: default (toggles appear off/toggled based on fill level; no hover/active indication visible)
- **Children**:
  - Row 1 — Volume slider: speaker icon (left), blue fill ~56% of track (x≈67–310), handle at x≈310, remaining track #555555 to x≈610
  - Row 2 — Brightness slider: sun icon (left), blue fill ~78% of track (x≈67–490), handle at x≈490, remaining track #555555 to x≈610

### Media Player Card  (`1060,665 490×95`)

- **Type**: media card
- **Content**: "My Queen is Angela Davis", "Sons Of Kemet"
- **Layout**: single-row flex (left → right): square album-art thumbnail, two-line text block (title above artist), then two circular control buttons spaced evenly at far right. Vertical centering of all three zones. Compact pill-shaped card, height ~95px.
- **Style**: dark rounded card (#383838 approx) over a slightly darker background (#282828). Title text white (#EEEEEE, ~16px, semibold). Artist text muted grey (#AAAAAA, ~12px, regular). Two circular button pills (#4F4F4F) with white icon glyphs inside. Album art: warm orange/amber-toned square thumbnail with illustrated figures. Subtle inner shadow / soft-edge border on the card.
- **States**: default — no hover, pressed, or disabled appearance visible; pause icon displayed but not in an active/pressed state.
- **Children**: 1 album-art thumbnail (orange square), 2 text lines (title + artist), 2 control buttons (⏸ pause, ⏭ skip-next), all within one pill-shaped container.

*(Shared lineage: same media card as in the earlier Collapsible Quick Settings/Notifications spec.)*

### Notification Group Card — Messages (in panel)  (`1060,765 490×145`)

- **Type**: card / notification group
- **Content**:
  - "Messages (app header, next to chat-bubble icon)"
  - "10 minutes ago"
  - "Graciela Campos"
  - "Do you fancy getting lunch some place first?"
  - "There's that dim sum place we've been meanin..."
  - "4 more notifications"
  - "NEW YORK (inset on avatar)"
- **Layout**: Column within single pill card. Top row: left app-icon+name + right timestamp (spaced apart). Sender bold text left-aligned, circular avatar floated right (top-aligned with sender). Two-line message body below — line 2 truncated with ellipsis. Footer: centered '4 more notifications' expand affordance.
- **Style**: Dark theme. Card bg ~#3C3C3C, backdrop ~#1E1E1E. White bold for sender names, muted grey #B8B8B8–#A0A0A0 for timestamps/body copy/footer links. Pill shape (~12–16px radius). Circular avatar (~36px) with photograph showing person and NEW YORK caption. No borders or shadows visible.
- **States**: default — collapsed/unexpanded state. Expansion triggered by footer text alone, no chevron icon.
- **Children**: 1 app-header-row (icon+label+timestamp), 1 sender-name line, 1 circular-avatar, 2 message-preview lines (truncated on line 2), 1 footer expansion link

*(Shared lineage: same collapsed group-card pattern as the earlier collapsible-notifications spec — app header row, sender/preview, avatar, "N more notifications" footer.)*

### Notification Group Card — Mail (in panel)  (`1060,910 490×150`)

- **Type**: list / card
- **Content**:
  - "Mail"
  - "1 hour ago"
  - "Isabell Engel"
  - "Weekend Hike Hey, how's it going? I booked the tickets for all of us, so I think everything sh..."
  - "2 more notifications"
- **Layout**: Column layout inside a single dark rounded card (~490x150px). Top row: mail icon + group label left-aligned, timestamp right-aligned. Middle block: sender name in bold, subject/preview line below. Avatar circle at far right of the preview-row band. Footer centered beneath content.
- **Style**: Background #2E2E2E (dark grey), rounded corners. Primary text #FFFFFF/#F0F0F0, timestamp & footer muted #9E9E9E. Avatar: circular ~40px, radial gradient amber #F5A623 to orange #E8752A, white 'IE' centered.
- **States**: default
- **Children**: card > header-row(icon+label, timestamp), sender-text, preview-text+avatar(circle), footer-text

### Top Bar — Right Mockup (detached stack)  (`1720,255 500×60`)

- **Type**: navigation / status-bar
- **Content**: (no text labels visible — icons only)
- **Layout**: Six system-status icons arranged horizontally inside a dark grey (`#333`) rounded pill container (~36px tall), right-aligned within the black top bar strip. Icons evenly spaced ~18-20px apart. Left edge of the full 500px bar shows a smooth horizontal gradient from solid black fading to transparent over ~40px where it meets the detached-stack white background.
- **Style**: Black (`#0A0A0A`) full-width background bar, 60px tall. Icon pill: `#333` rounded rectangle with `~18px` border-radius. Icon colors: NotificationBell=white+blue dot badge, ScreenShare=`#E56050` (on), Microphone=`#E05050` (muted/active), Bluetooth/network=`#CCCCCC`, Volume=`#CCCCCC`, Power/Battery=white outline with green interior fill. All icons filled/outlined glyphs, ~20x20px each.
- **States**: ScreenShare & Microphone rendered in red accent (`#E56050`) indicating **active/on** state; Bell has a blue dot badge (`#4A9BFF`) for notifications; remaining icons in neutral grey-white suggesting default/ready.
- **Children**: 6 icons in sequence L→R: (1) Bell with blue dot badge, (2) Red screen-share/mirroring glyph, (3) Red microphone glyph, (4) Grey wireless signal arc, (5) Grey speaker with sound waves, (6) White battery/plug outline with green fill segment.

### Collapsed Messages Group — faded stack top (detached view)  (`1740,310 470×165`)

- **Type**: card / notification-group-header
- **Content**: "Messages" (top-left header with muted bell icon); "Graciela Campos" (sender name); preview text — "Do you fancy getting lunch some place first? There's that dim sum place we've been meanin…"; "4 more notifications" (centered label below preview); "10 minutes ago" (faint timestamp, top-right)
- **Layout**: row-based card. Top row: left-aligned sender "Graciela Campos" on upper line, right side has circular avatar (~36px diameter). Below avatar row: centered multi-line preview (two lines, second truncated with ellipsis). Bottom-center: "4 more notifications" in smaller caps-style text. Card itself uses dark background (#2A2A2A equivalent) with full corner radius, rounded-pill shape.
- **Style**: Entirely desaturated/faded — low opacity overlay against darker backdrop. Text color ~#B0B0B0 (light grey, reduced from full white). Background card ~#2E2E2E–#333 range but visually muted by an alpha layer. Avatar ring retains faint color (portrait visible but washed-out). Typography: bold sender name (sans-serif, ~13px), regular-weight body preview (~12px, truncated at 80ch), small-caps system label ("4 MORE NOTIFICATIONS" or title case). Rounded corners (pill/badge shape). No visible borders or shadows beyond the card surface.
- **States**: selected/collapsed — card is in a depressed, inactive visual state. It conveys "this group exists but is not currently expanded". The faded/dimmed treatment contrasts with the brighter expanded Mail group overlapping it below/behind, establishing depth-layering. The blur/fade communicates it is visually behind the foreground element rather than disabled.
- **Children**: one circular avatar image (person portrait, possibly Graciela Campos); one group-title label ("Messages") with inline bell/notification-icon; one sender-name label; two-line truncated preview paragraph; one action-line label ("4 more notifications"); one timestamp ("10 minutes ago", very faint). Total: ~6 sub-elements within single pill-shaped card container.

### Mail Group Header (detached view)  (`1740,470 470×45`)

- **Type**: navigation / notification-group header
- **Content**: "Mail" (left), two vertical arrow/chevron glyphs inside circular button (right) — downward-pointing ▼ above upward-pointing ▲
- **Layout**: single horizontal row, flex start/end distribution — title flush-left, circular button aligned right; generous whitespace between them (~70%+ of row width is negative space)
- **Style**: background #2B2B2D (dark charcoal); title #FFFFFF white, bold/sans-serif, ~18–20px; circular button #4E4E50 (medium-dark gray), slightly lighter than background, full-height within row; chevrons #F5F5F5 off-white, small (~10–12px), stacked vertically center-right inside button
- **States**: default — button not hovered or pressed; chevrons suggest collapsible/expandable toggle (double-chevron = group collapse control, not close)
- **Children**: 1 text label ('Mail'), 1 circular toggle button containing 2 stacked chevron arrows

*(Glyph verified against the crop by the orchestrator: the button contains two stacked chevrons, ▼ over ▲ — a collapse/expand control, not an ✕ close button.)*

### Mail Notification — Expanded Card (detached view)  (`1740,510 470×180`)

- **Type**: card (expanded notification detail)
- **Content**: Isabell Engel, Weekend Hike, preview text; mark read, archive
- **Layout**: vertical stack: circular avatar -> sender/subject/preview rows -> horizontal action-bar with two equal-width pills evenly distributed, text-centered
- **Style**: white text on #0E0E0E-bg; golden-orange (#F5A623) circular avatar with radial gradient; pill-shaped buttons with full border-radius; subtle divider separating content from action-row
- **States**: expanded/visible; buttons default
- **Children**: 1 circular avatar, 1 unread indicator, 2 equal-width action pills

Exact text transcription (enrichment pass, same agent):

1. Header (top-left): "Mail" (preceded by envelope icon)
2. Timestamp (top-right): "1 hour ago"
3. Sender name: "Isabell Engel"
4. Subject + preview (bold subject inline with normal-weight preview): "Weekend Hike Hey, how's it going? I booked the tickets for all of us, so I think everything..."
5. Avatar initials: "IE"
6. Action button 1 (left): "Mark Read"
7. Action button 2 (right): "Archive"

Subject "Weekend Hike" renders in bold typeface immediately followed by the preview text without separator on the same line. Preview text truncates with ellipsis ("...") indicating additional content exists but is clipped.

*(This is the expanded counterpart of the collapsed "Mail / Isabell Engel" card shown inside the left panel — same notification, two states.)*

### Mail Notification Stack — Collapsed Sibling Cards (detached view)  (`1740,685 470×265`)

- **Type**: list / notification group (collapsed siblings)
- **Content**: Two cards, each with source label, timestamp, sender name, subject + preview text, and stack indicator:
  - Card 1: `☐ Mail` · `3 hours ago` · `Mikael Laine` · `GUADEC Talk Just watched your GUADEC talk on the live stream, great job!` · `...`
  - Card 2: `☐ Mail` · `4 hours ago` · `Graciela Campos` · `Website redesign Hey, so I looked at the designs and I think we're good to go, what...` · `...`
- **Layout**: Column stacking — two rounded rectangle cards in a vertical column, each card structured as: header row (Mail icon+label left-aligned, timestamp right-aligned), then body row (sender name bold title-case left, avatar circle on far right), then multi-line preview text below name, then centered `...` stack indicator at card bottom. Cards are separated by a small gap. Each card spans full slice width.
- **Style**: Dark grey card backgrounds (`#2E2E2E`–`#363636`), dark charcoal page backdrop. Top bar: white envelope checkbox icon + `Mail` in white (small caps). Timestamps: light grey (`#9E9E9E`). Sender names: white, semi-bold, title case. Preview text: `GUADEC Talk` is white/bold (subject), rest of line light grey (body); `Website redesign` is white/bold (subject), rest is light grey with trailing ellipsis. Stack `...`: medium-grey (`#6B6B6B`), monospaced or three-dot glyphs. Avatar 1 (top): circular silhouette — black figure profile on muted tan background. Avatar 2 (bottom): circular gradient blue fill (`#3B82F6` → `#60A5FA`) with white sans-serif bold initials `GC`. Border radius ≈ 8–12px on cards. No visible borders or shadows (flat design).
- **States**: default (both cards appear static/collapsed, indicated by `...` stack marker suggesting there are more notifications below).
- **Children**: For each card: (1) header row — Mail source badge + timestamp, (2) sender line — name left / avatar circle right, (3) subject+preview text block, (4) bottom `...` centered. The cards themselves are children of a larger Mail notification group (only the bottom two sibling cards are visible in this crop).

### Notification Stack — Faded Bottom Card (detached view)  (`1740,990 470×110`)

- **Type**: notification / collapsed card (stack footer indicator)
- **Content**:
  - Top-left: `Mail` (with envelope icon ☐)
  - Top-right: `1 hour ago`
  - Sender name: `Isabell Engel`
  - Subject line: `Weekend Hike`
  - Preview text: `Hey, how's it going? I booked the tickets for all of us, so I think everything sh...` (truncated with ellipsis)
  - Right: Bronze/gold circular avatar with initials `IE`
- **Layout**: Horizontal row — subject+preview on left, avatar circle on right; top bar has group label (left) and timestamp (right, far-end). Compact single-line columns below top bar.
- **Style**: Dark grey card bg (`#2B2B2B`); text in muted grey (`#9E9E9E` for "Mail", `#AAAAAA` for preview, `#CCCCCC` for sender name and subject). Avatar: bronze/amber gradient (`#C4823D` → `#A0652B`). Card background is noticeably dimmed/saturation-depressed vs an active card.
- **States**: Selected/active (pinned expanded state) — fully visible but visually recessed behind higher-priority mail above; serves as a stack-footer illusion piece.
- **Children**: Envelope icon + label row; sender name (bold, larger); subject (bold, slightly larger than body); truncated preview paragraph; circular avatar icon.

**Fade/clip treatment**: Bottom ~25% of the card is clipped by a hard horizontal cut — the preview text is visibly cut mid-word ("sh…") suggesting this is a card that continues beneath, reinforcing stacked depth. The entire card is desaturated compared to fully visible cards above it, conveying it sits deeper in the stack.

## Design Tokens

### Colors

| Hex | Where used |
|---|---|
| `#FFFFFF` | Page background (spec sheet); primary text & icons on dark UI (titles, sender names, toggle glyphs, top bar) |
| `#000000` / `#0A0A0A` | Top bar background (both mockups) |
| `#1E1E1E` | Quick-panel background; slider/notification backdrop |
| `#2A2A2A`–`#2B2B2D` | Status-icon pill on top bar; faded stack cards; Mail group header bg |
| `#2E2E2E`–`#3C3C3C` | Notification card backgrounds (reports vary per slice — likely one or two card tones with estimation noise; see Open Questions) |
| `#363636` | Battery pill & session buttons (panel header) |
| `#383838` | Media-player card |
| `#4E4E50` / `#4F4F4F` | Small circular buttons (media controls, Mail group collapse button) |
| `#555555` | Slider track (unfilled) |
| `#5B9BF2` | Slider fill (GNOME-style blue accent) |
| `#4A9EFF` / `#4A9BFF` | Notification dot badge on top-bar bell (same token, two estimates) |
| `#E54C4C` / `#E05555` / `#E56050` | Active/alert red: Screen Sharing & Microphone toggles; top-bar screen-share & mic icons (same token, three estimates) |
| `#2ECC71` / `#44CC44` | Green battery charge fill (panel pill & top-bar icon; same token, two estimates) |
| `#C8C8C8` | Off-state toggle circles (light grey) |
| `#9A9A9A` | Dim-active toggle circles (Do Not Disturb, Night Light, Dark Mode) |
| `#808080` | Toggle label carets |
| `#9E9E9E` / `#AAAAAA` / `#B8B8B8` / `#B0B0B0` / `#CCCCCC` / `#D0D0D0` / `#D4D4D4` | Muted grey ramp: timestamps, footers, preview/body text, labels, slider icons (per-slice estimates; likely a 3–4-step ramp) |
| `#6B6B6B` | "…" stack indicators |
| `#F5A623` → `#E8752A` | Amber/orange avatar gradient ("IE"); dimmed estimate `#C4823D` → `#A0652B` on the faded stack card |
| `#3B82F6` → `#60A5FA` | Blue avatar gradient ("GC") |
| `#2D2D2D` / `#3D3D3D` | Spec header title / subtitle on white page |

### Typography

| Style | Where used |
|---|---|
| ~36–40px, extra-bold, sans-serif, `#2D2D2D` | Spec title "Quick Toggles" |
| ~14–15px, regular, `#3D3D3D` | Spec subtitle |
| ~13–14pt, medium (~500), white | Top bar labels & clock |
| ~18–20px, bold, white | Expanded group title ("Mail", detached view) |
| ~16px, semibold, white (`#EEEEEE`) | Media track title; sender names |
| ~14px, title case, `#D0D0D0` | Toggle labels; panel header pill text |
| ~13px, bold, white/light grey | Notification sender names |
| ~12px, regular, muted grey (`#9E9E9E`–`#AAAAAA`) | Artist line, timestamps, preview body, "N more notifications" footers |
| Small-caps / title case, muted | "4 more notifications" affordance (casing ambiguous between slices) |

Family throughout: clean sans-serif (GNOME system typeface — Cantarell/Noto-like).

### Spacing & Shape

- **Panel radius**: quick-panel and toggle-grid container ~16px corner radius.
- **Cards**: notification pill cards ~12–16px radius (left panel); detached-stack cards ~8–12px radius — a possible inconsistency, see Open Questions.
- **Top bar**: 55–60px tall; status pill ~28–36px tall with ~18–27px radius; icons ~20–22px at ~8–20px gaps.
- **Toggle grid**: 4 columns at ~70px gutters, ~50px row gap; circular icon buttons above labels.
- **Sliders**: ~37px row gap; round handles `#E8E8E8` with subtle drop shadow, flush with fill end.
- **Media card**: ~95px pill; square album art; circular control pills.
- **Flat design**: no borders or shadows on cards; depth in the detached stack is conveyed by desaturation/alpha fade and hard clipping, not elevation shadows.

## Interactions & States

- **Quick toggles** (panel): three visual states — off (light grey `#C8C8C8` circle: MyWifi, Bluetooth, Keyboard), dim-active (darker grey `#9A9A9A`: Do Not Disturb, Night Light, Dark Mode), and alert-active (red `#E54C4C`: Screen Sharing, Microphone). Dropdown carets (▼) on all labels except Dark Mode, implying per-toggle sub-menus.
- **Session buttons** (panel header): settings / lock / power; power button renders slightly darker — possibly a pressed/deeper state, ambiguous.
- **Battery pill**: charging state ("56% - 1:54 until full", green fill + lightning inset on the top-bar battery icon).
- **Sliders**: volume ~56%, brightness ~78%; icon-only, no value readout.
- **Top bar status icons**: bell with blue unread dot; screen-share and microphone in red (active); Wi-Fi/volume neutral; battery green/charging.
- **Collapsed notification groups** (panel): "N more notifications" footer text is the expansion affordance — no chevron; expansion target shown by the detached view.
- **Expanded group** (detached view): group header with double-chevron (▼ over ▲) collapse control; top notification expanded with **Mark Read** / **Archive** action pills; collapsed siblings below carry centered "…" stack indicators; faded, desaturated cards above (Messages group) and below (clipped Mail card) visualize stack depth.
- **Media player**: pause + skip-next controls; pause icon shown (playing state), no pressed/hover styling.

## Open Questions

- **Toggle state semantics**: what distinguishes dim-active grey (Do Not Disturb, Night Light, Dark Mode) from alert-active red (Screen Sharing, Microphone)? Privacy/attention-critical vs ordinary on-state is the likely intent, but the spec doesn't say.
- **Card background tone**: slices report card backgrounds from `#2E2E2E` to `#3C3C3C` — one token with sampling noise, or distinct tones for panel cards vs stack cards? Similarly the red accent has three estimates (`#E54C4C`/`#E05555`/`#E56050`).
- **Card radius mismatch**: ~12–16px in the panel vs ~8–12px in the detached stack — intentional or estimation drift?
- **"N more notifications" behavior**: is the footer a button? Does expansion happen in-place in the panel or as the detached stack shown on the right?
- **Double-chevron button**: collapse-only, or does it cycle expand/collapse of the group? (Confirmed not a close ✕.)
- **"…" stack indicators** under collapsed siblings: passive depth cue or tappable?
- **Power button darker shade**: pressed state or just styling variance?
- **Truncated content**: preview strings are clipped with ellipses; the faded stack cards are only partially legible by design, so their full text is unverifiable.
- **Caret sub-menus**: destinations for MyWifi ▼, Bluetooth ▼, Keyboard ▼, Screen Sharing ▼, Microphone ▼ are not shown in this sheet.

---

Slice crops retained at `slices/` (15 PNGs, `01-spec-header` … `15-right-stack-collapsed-bottom`).
