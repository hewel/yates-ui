# Quick Settings Design Spec — UI Splits

Source image: `source.png` (5480×2400, in this directory), split into 30 pure-UI crops by logical structure.
All annotation text (titles, labels, design notes) was extracted from the source via the project `ocr` agent (`bailian-token-plan/qwen3.6-flash`) and is recorded verbatim in the [Raw OCR Output](#raw-ocr-output) appendix — no separate text crops are kept.

## Design Principles (from the spec header)

- Wired connections, mobile broadband and location services **do not appear in the menu** — they are not something you often toggle.
- Audio sliders get a menu if there's more than one device.
- Sub-menu header icon background reflects the state of each quick toggle button.
- Screen recording and screen sharing have a stop button in the top bar (an immediate way to stop is required). Other privacy alerts (camera, microphone, location) are indicators only. Clicking the recording indicator stops it; clicking the sharing indicator opens a popover with info and a stop button. The second sharing indicator is for when the shell doesn't control the sharing.

---

## panels/ — Full Panel Examples (5)

Each panel includes its mockup system-bar strip (part of the UI context).

| File | What it represents |
|---|---|
| `example-laptop.png` | Typical laptop: battery 56% + volume/brightness sliders + Wi-Fi (connected to Network 1234), Bluetooth, Power Mode (Balanced), Night Light, Dark Style, Airplane Mode + "3 Background Apps" entry |
| `example-desktop.png` | Typical desktop: minimal panel — Wired + Power Mode (Balanced) + Night Light + Dark Style only (no Bluetooth/Airplane) |
| `example-complex.png` | Complex case: laptop set plus VPN (Server 1234), Auto Rotate and more toggle rows + Background Apps entry |
| `lockscreen-laptop.png` | Lock screen (laptop): same panel structure with lock indicator on the system bar |
| `lockscreen-desktop.png` | Lock screen (desktop): same minimal panel as the desktop case |

## toggles/ — Quick Toggle Variants (11)

Each crop shows every state variant of one toggle (off / on / on-and-active). Left-side labels were excluded; their display rules:

| File | Display rule (from spec) |
|---|---|
| `wired.png` | Shown when a wired connection is present |
| `wi-fi.png` | Displayed when there's a Wi-Fi modem (connected state shows network name) |
| `mobile-connections.png` | Displayed when there's a mobile modem |
| `bluetooth-tethers.png` | Displayed when a paired bluetooth device provides cellular connectivity |
| `vpn.png` | Displayed when a VPN is configured |
| `bluetooth.png` | Displayed when there's a Bluetooth adapter |
| `power-mode.png` | Tri-state (Performance / Balanced / Power Saver). Always shown |
| `night-light.png` | Always shown |
| `dark-mode.png` | Always shown |
| `airplane-mode.png` | Shown when the device has Wi-Fi/Bluetooth/Cellular |
| `screen-rotation.png` | Shown when the screen rotates |

## submenus/ — Sub-menu Panels (13)

In-panel title bars are kept (their icon background reflects the toggle's state).

| File | Content and behavior |
|---|---|
| `power-off.png` | Suspend / Restart… / Power Off… / Log Out… / Switch User… — "Switch User" only shown when there's more than one user account |
| `mobile-connections.png` | Can list multiple mobile connections; each modem is listed and connected/disconnected via its menu item (example: Carrier ABC + Connect) |
| `bluetooth.png` | Lists connected devices and set-up-but-unconnected devices, connected first; the list is not reordered while open to keep it stable |
| `bluetooth-empty.png` | Empty state: "No available or connected devices" |
| `bluetooth-off-state.png` | Bluetooth off: "Turn on Bluetooth to connect to devices" (spec note: is there an easy way to include a turn-on action here?) |
| `bluetooth-tethers.png` | Can list multiple bluetooth tether connections, each connect/disconnect via its menu item (example: Phone ABC + Connect) |
| `background-apps.png` | No empty state — the menu isn't shown at all without background apps. Example: Nextcloud syncing (40/90 MB), Telegram (3982 messages), Mozilla VPN + App Settings |
| `sound-output.png` | Output device list with ✓ on the active one (Headphones - Built-in Audio / Thunderbolt 3 Dock Audio) + Sound Settings |
| `wired-connections.png` | Lists a maximum of 8 wired connections (example: Wired Connection 1 + Disconnect) + Network Settings |
| `vpn.png` | Lists the eight last used networks (Server 1234 / Server 2345) + Network Settings |
| `vpn-empty-state.png` | Empty state: "Networks will show here when used" |
| `wi-fi.png` | Lists the eight strongest Wi-Fi networks (Office, O2-335680, …) + All Networks entry |
| `power-mode.png` | Tri-state picker: Performance / Balanced (✓) / Power Saver |

## top-bar.png — System Top Bar Strip

Black strip: red screen-recording timer (0:32) + orange screen-sharing indicator + accessibility / input-language / location / brightness / USB / cellular / Wi-Fi / VPN / Bluetooth / microphone / volume / battery / power icons. Behavior rules in [Design Principles](#design-principles-from-the-spec-header).

---

## Raw OCR Output

Verbatim text extracted from the source image, per region. Preserved as-is, including OCR artifacts.

### Header region

```text
Quick Settings

Wired connections, mobile broadband and location services don't appear in
the menu — they are not something you often toggle.

Audio sliders get a menu if there's more than one device.

Example system menus                          Lock screen
```

### Toggle labels region

```text
Toggle buttons

Wired
Shown when a wired connection is present

Wi-Fi
Displayed when there's a Wi-Fi modem

Mobile Connections
Displayed when there's a mobile modem

Bluetooth Tethers
Displayed when a paired bluetooth device provides
cellular connectivity

VPN
Displayed when a VPN is configured

Bluetooth
Displayed when there's a Bluetooth adapter

Power Mode
Tri-state. Always shown.

Night light
Always shown.

Dark mode
Always shown.

Airplane Mode
Shown when the device has Wi-Fi/Bluetooth/Cellular

Screen rotation
Shown when the screen rotates
```

### Top bar text region

```text
Top bar

0:32 en

Screen recording and screen sharing have a button to stop the service in the top bar. These are special in that you do need an immediate way to stop. Other privacy-related alerts (camera, microphone, location) are indicators only.

Screen recording stops when you click the indicator. For screen shares, clicking the indicator opens a popover with information and a stop button.

The second screen sharing indicator is for when the shell doesn't control the sharing.
```

### Example menus column

```text
Example system menus

Typical laptop case

56%
Wi-Fi
Network 1234
Bluetooth
Power Mode
Balanced
Night Light
Dark Style
Airplane Mode
3 Background Apps

Typical desktop case

Wired
Power Mode
Balanced
Night Light
Dark Style

Complex case

56%
Wi-Fi
Network 1234
VPN
Server 1234
Bluetooth
Power Mode
Balanced
Night Light
Dark Style
Airplane Mode
Auto Rotate
3 Background Apps
```

### Sub-menus area

```text
Sub-menus
Header icon background reflects the state of each quick toggle button.

Power Off
Switch user only shown when there's more than one user account.

Power Off
Suspend
Restart...
Power Off...
Log Out...
Switch User...

Mobile Connections
Can list multiple mobile connections.
Each modem is listed and can be connected/disconnected using its menu item.

Mobile Connections
Carrier ABC Connect
Bluetooth Settings

Bluetooth
Lists connected and available and set up devices which aren't connected.
Connected devices are listed first. The list is not reordered while it is opened, in order to keep it stable.

Bluetooth
Headphones 1234 Disconnect
Mouse 1234 Disconnect
Keyboard 1234
Mouse 4321 Connect
Bluetooth Settings

Background Apps
No empty state here – the menu isn't shown if there aren't any background apps

Background Apps
Apps running without a window
Nextcloud
Synchronizing (40 / 90 MB)
Telegram
3982 messages
Mozilla VPN
App Settings

Audio Output

Sound Output
Headphones - Built-in Audio
Thunderbolt 3 Dock Audio
Sound Settings

Bluetooth Tethers
Can list multiple bluetooth tethers connections.
Each tether can be connected/disconnected using its menu item.

Bluetooth Tethers
Phone ABC Connect
Bluetooth Settings

Empty state

Bluetooth
No available or connected devices
Bluetooth Settings

Wired
Lists a maximum of 8 wired connections.

Wired Connections
Wired Connection 1 Disconnect
Network Settings

VPN
Lists the eight last used networks.

VPN
Server 1234
Server 2345
Networks Settings

Off state. Is there an easy way to include a turn on action here?

Bluetooth
Turn on Bluetooth to connect to devices
Bluetooth Settings

Wi-Fi
Eight strongest Wi-Fi networks are listed.

Wi-Fi
Office
O2-335680
FBI Surveillance Van
Vodafone-2381249
Vodafone-3331205
FBI Surveillance Van
Vodafone-2381249
Vodafone-3331205
All Networks

Empty state:

VPN
Networks will show here when used
Network Settings

Power Mode

Power Mode
Performance
Balanced
Power Saver
```

---

## Reproduction

```bash
# UI crops: pixel-level panel boundary detection on the 5480×2400 source
# (coordinates hard-coded per source layout)

# Text extraction: project-scoped ocr subagent (bailian-token-plan/qwen3.6-flash)
await agent("Extract all text from this image: <path>", { agent: "ocr" })
```
