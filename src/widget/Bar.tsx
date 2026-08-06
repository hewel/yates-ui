import GLib from "gi://GLib"
import Gio from "gi://Gio"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import Gtk4LayerShell from "gi://Gtk4LayerShell?version=1.0"
import Pango from "gi://Pango"

import Niri from "gi://AstalNiri"
import Tray from "gi://AstalTray"
import Network from "gi://AstalNetwork"
import Battery from "gi://AstalBattery"
import Wp from "gi://AstalWp"
import Apps from "gi://AstalApps"

import { format } from "date-fns"
import {
  Accessor,
  For,
  With,
  createBinding,
  createComputed,
  createEffect,
  createRoot,
  createState,
} from "gnim"

import {
  bar,
  barVertical,
  batteryLabel,
  clock,
  windowTitle,
  workspaceButton,
  workspaceButtonActive,
  workspacePopup,
  workspaces,
} from "./Bar.css"

function createPoll<T>(initial: T, interval: number, fn: () => T): Accessor<T> {
  const [value, setValue] = createState(initial)
  const update = () => setValue(fn())
  update()
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
    update()
    return GLib.SOURCE_CONTINUE
  })
  return value
}

const niri = Niri.get_default()

const clockLabel = createPoll("", 1000, () => format(new Date(), "EEE MMM d  HH:mm"))
const hourLabel = createPoll("", 1000, () => format(new Date(), "HH"))
const minuteLabel = createPoll("", 1000, () => format(new Date(), "mm"))

const apps = new Apps.Apps()

function iconForAppId(appId: string | null): { iconName?: string; gicon?: Gio.Icon } {
  const FALLBACK = { iconName: "application-x-executable-symbolic" }
  if (!appId) return FALLBACK
  const id = appId.toLowerCase()
  const list = apps.get_list()
  const found =
    list.find((a) => a.entry?.toLowerCase() === `${id}.desktop`) ??
    list.find((a) => a.wmClass?.toLowerCase() === id) ??
    list.find((a) => a.name?.toLowerCase() === id)
  const icon = found?.iconName
  if (!icon) return FALLBACK
  if (icon.includes("/")) return { gicon: Gio.FileIcon.new(Gio.File.new_for_path(icon)) }
  return { iconName: icon }
}

type Orientation = "horizontal" | "vertical"

function gtkOrientation(o: Orientation): Gtk.Orientation {
  return o === "vertical" ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL
}

function Workspaces({
  gdkmonitor,
  orientation,
  onHover,
  onLeave,
}: {
  gdkmonitor: Gdk.Monitor
  orientation: Orientation
  onHover: (ws: Niri.Workspace, btn: Gtk.Button) => void
  onLeave: () => void
}) {
  const workspaces_ = createBinding(niri, "workspaces")
  const focused = createBinding(niri, "focusedWorkspace")
  const mine = createComputed(() =>
    workspaces_().filter((ws) => ws.output === gdkmonitor.connector),
  )

  return (
    <Gtk.Box class={workspaces} orientation={gtkOrientation(orientation)} spacing={8}>
      <For each={mine}>
        {(ws: Niri.Workspace) => (
          <Gtk.Button
            canFocus={false}
            class={createComputed(() =>
              focused()?.id === ws.id
                ? `${workspaceButton} ${workspaceButtonActive}`
                : workspaceButton,
            )}
            onClicked={() => ws.focus()}
            $={(self: Gtk.Button) => {
              const motion = new Gtk.EventControllerMotion()
              motion.connect("enter", () => onHover(ws, self))
              motion.connect("leave", () => onLeave())
              self.add_controller(motion)
            }}
          >
            <Gtk.Label label={ws.name ?? String(ws.idx)} />
          </Gtk.Button>
        )}
      </For>
    </Gtk.Box>
  )
}

function WindowTitle() {
  const focused = createBinding(niri, "focusedWindow")
  const title = createComputed(() => focused()?.title ?? "")

  return (
    <Gtk.Label
      class={windowTitle}
      label={title}
      ellipsize={Pango.EllipsizeMode.END}
      maxWidthChars={32}
      visible={createComputed(() => title().length > 0)}
    />
  )
}

function SysTray({ orientation }: { orientation: Orientation }) {
  const tray = Tray.get_default()
  const items = createBinding(tray, "items")

  return (
    <Gtk.Box spacing={8} orientation={gtkOrientation(orientation)}>
      <For each={items}>
        {(item: Tray.TrayItem) => (
          <Gtk.Image
            gicon={createBinding(item, "gicon")}
            tooltipText={createBinding(item, "tooltipText")}
            pixelSize={16}
          />
        )}
      </For>
    </Gtk.Box>
  )
}

function NetworkIcon() {
  const network = Network.get_default()
  const wifiIcon = createBinding(network, "wifi", "iconName")
  const wiredIcon = createBinding(network, "wired", "iconName")
  const icon = createComputed(
    () => wifiIcon() ?? wiredIcon() ?? "network-offline-symbolic",
  )

  return <Gtk.Image iconName={icon} pixelSize={16} />
}

function VolumeIcon() {
  const speaker = Wp.get_default().defaultSpeaker

  return <Gtk.Image iconName={createBinding(speaker, "volumeIcon")} pixelSize={16} />
}

function BatteryStatus({ orientation }: { orientation: Orientation }) {
  const bat = Battery.get_default()
  const pct = createBinding(bat, "percentage")

  return (
    <Gtk.Box
      spacing={4}
      orientation={gtkOrientation(orientation)}
      visible={createBinding(bat, "isPresent")}
    >
      <Gtk.Image iconName={createBinding(bat, "batteryIconName")} pixelSize={16} />
      <Gtk.Label class={batteryLabel} label={pct.as((p) => `${Math.round(p * 100)}%`)} />
    </Gtk.Box>
  )
}

export default function Bar(
  gdkmonitor: Gdk.Monitor,
  application: Gtk.Application,
  orientation: Orientation,
) {
  const vertical = orientation === "vertical"
  const [popupWs, setPopupWs] = createState<Niri.Workspace | null>(null)

  let hideSource = 0
  const cancelHide = () => {
    if (hideSource) {
      GLib.source_remove(hideSource)
      hideSource = 0
    }
  }
  const scheduleHide = () => {
    cancelHide()
    hideSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
      hideSource = 0
      setPopupWs(null)
      return GLib.SOURCE_REMOVE
    })
  }

  const popup = createRoot(() => (
    <Gtk.Window
      application={application}
      name="workspace-popup"
      visible={createComputed(() => popupWs() !== null)}
      $={(self: Gtk.Window) => {
        const motion = new Gtk.EventControllerMotion()
        motion.connect("enter", cancelHide)
        motion.connect("leave", scheduleHide)
        self.add_controller(motion)
      }}
    >
      <Gtk.Box class={workspacePopup}>
        <With value={popupWs}>
          {(ws: Niri.Workspace | null) => {
            if (!ws) return ""
            const wins = createBinding(niri, "windows")
            const sorted = createComputed(() =>
              wins()
                .filter((w) => w.workspaceId === ws.id)
                .sort(
                  (a, b) =>
                    (a.layout?.tile_pos_in_workspace_view?.[0] ?? 0) -
                    (b.layout?.tile_pos_in_workspace_view?.[0] ?? 0),
                ),
            )
            createEffect(() => {
              if (sorted().length === 0) setPopupWs(null)
            })
            return (
              <Gtk.Box spacing={10}>
                <For each={sorted}>
                  {(w: Niri.Window) => (
                    <Gtk.Image
                      {...iconForAppId(w.appId)}
                      pixelSize={24}
                      tooltipText={w.title ?? undefined}
                    />
                  )}
                </For>
              </Gtk.Box>
            )
          }}
        </With>
      </Gtk.Box>
    </Gtk.Window>
  )) as Gtk.Window

  Gtk4LayerShell.init_for_window(popup)
  Gtk4LayerShell.set_layer(popup, Gtk4LayerShell.Layer.OVERLAY)
  Gtk4LayerShell.set_namespace(popup, "yates-workspace-popup")
  Gtk4LayerShell.set_anchor(popup, Gtk4LayerShell.Edge.LEFT, true)
  Gtk4LayerShell.set_anchor(popup, Gtk4LayerShell.Edge.TOP, true)
  Gtk4LayerShell.set_monitor(popup, gdkmonitor)

  const showPopup = (ws: Niri.Workspace, btn: Gtk.Button) => {
    cancelHide()
    // Workspace.windows is unreliable in gjs (null / unconvertible GIR array);
    // derive from the Niri-level list instead. Note: use get_windows() —
    // the JS property accessor fails GI conversion for array properties.
    const count = niri.get_windows().filter((w) => w.workspaceId === ws.id).length
    if (count === 0) {
      setPopupWs(null)
      return
    }
    const [, bounds] = btn.compute_bounds(win)
    if (vertical) {
      Gtk4LayerShell.set_margin(popup, Gtk4LayerShell.Edge.LEFT, win.get_width() + 2)
      Gtk4LayerShell.set_margin(
        popup,
        Gtk4LayerShell.Edge.TOP,
        Math.max(0, Math.round(bounds.get_y())),
      )
    } else {
      Gtk4LayerShell.set_margin(popup, Gtk4LayerShell.Edge.TOP, win.get_height() + 2)
      Gtk4LayerShell.set_margin(
        popup,
        Gtk4LayerShell.Edge.LEFT,
        Math.max(0, Math.round(bounds.get_x())),
      )
    }
    setPopupWs(ws)
  }

  const win = createRoot(() => (
    <Gtk.Window application={application} name="bar">
      <Gtk.CenterBox
        class={vertical ? barVertical : bar}
        orientation={vertical ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL}
      >
        <Gtk.Box $type="start" spacing={10} orientation={gtkOrientation(orientation)}>
          <Workspaces
            gdkmonitor={gdkmonitor}
            orientation={orientation}
            onHover={showPopup}
            onLeave={scheduleHide}
          />
          {!vertical && <WindowTitle />}
        </Gtk.Box>
        {vertical ? (
          <Gtk.Box $type="center" orientation={Gtk.Orientation.VERTICAL} class={clock}>
            <Gtk.Label label={hourLabel} />
            <Gtk.Label label={minuteLabel} />
          </Gtk.Box>
        ) : (
          <Gtk.Label $type="center" class={clock} label={clockLabel} />
        )}
        <Gtk.Box $type="end" spacing={8} orientation={gtkOrientation(orientation)}>
          <SysTray orientation={orientation} />
          <NetworkIcon />
          <VolumeIcon />
          <BatteryStatus orientation={orientation} />
          <Gtk.Image iconName="system-shutdown-symbolic" pixelSize={16} />
        </Gtk.Box>
      </Gtk.CenterBox>
    </Gtk.Window>
  )) as Gtk.Window

  Gtk4LayerShell.init_for_window(win)
  Gtk4LayerShell.set_layer(win, Gtk4LayerShell.Layer.TOP)
  Gtk4LayerShell.set_namespace(win, "yates-bar")
  Gtk4LayerShell.set_anchor(win, Gtk4LayerShell.Edge.TOP, true)
  Gtk4LayerShell.set_anchor(win, Gtk4LayerShell.Edge.LEFT, true)
  if (vertical) {
    Gtk4LayerShell.set_anchor(win, Gtk4LayerShell.Edge.BOTTOM, true)
  } else {
    Gtk4LayerShell.set_anchor(win, Gtk4LayerShell.Edge.RIGHT, true)
  }
  Gtk4LayerShell.auto_exclusive_zone_enable(win)
  Gtk4LayerShell.set_monitor(win, gdkmonitor)

  win.present()
  return win
}
