import Apps from "gi://AstalApps"
import Battery from "gi://AstalBattery"
import Network from "gi://AstalNetwork"
import Tray from "gi://AstalTray"
import Wp from "gi://AstalWp"
import Gdk from "gi://Gdk?version=4.0"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import Gtk from "gi://Gtk?version=4.0"
import Gtk4LayerShell from "gi://Gtk4LayerShell?version=1.0"
import Pango from "gi://Pango"

import { format } from "date-fns"
import {
  For,
  With,
  createBinding,
  createComputed,
  createEffect,
  createRoot,
  createState,
} from "gnim"

import { diagnosticLog } from "../debug/log"
import { NiriWindow, NiriWorkspace, windowsForWorkspace } from "../niri/state"
import { BarServices } from "../services/barServices"
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
import { PopupController, PopupSnapshot } from "./popupController"

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

function requireGtkWindow(value: unknown): Gtk.Window {
  if (value instanceof Gtk.Window) return value
  throw new Error("Gnim root did not construct a Gtk.Window")
}

function Workspaces({
  gdkmonitor,
  orientation,
  services,
  onHover,
  onLeave,
}: {
  gdkmonitor: Gdk.Monitor
  orientation: Orientation
  services: BarServices
  onHover: (ws: NiriWorkspace, btn: Gtk.Button) => void
  onLeave: () => void
}) {
  const state = services.niri.state
  const mine = createComputed(() =>
    state().workspaces.filter((ws) => ws.output === gdkmonitor.connector),
  )

  return (
    <Gtk.Box class={workspaces} orientation={gtkOrientation(orientation)} spacing={8}>
      <For each={mine}>
        {(ws: NiriWorkspace) => (
          <Gtk.Button
            canFocus={false}
            class={createComputed(() =>
              state().focusedWorkspaceId === ws.id
                ? `${workspaceButton} ${workspaceButtonActive}`
                : workspaceButton,
            )}
            onClicked={() => services.niri.focusWorkspace(ws.id)}
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

function WindowTitle({ services }: { services: BarServices }) {
  const title = createComputed(() => {
    const state = services.niri.state()
    return state.windows.find((window) => window.id === state.focusedWindowId)?.title ?? ""
  })

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
  const icon = createComputed(() => wifiIcon() ?? wiredIcon() ?? "network-offline-symbolic")

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
  services: BarServices,
) {
  const vertical = orientation === "vertical"
  const [popupSnapshot, setPopupSnapshot] = createState<PopupSnapshot>({
    workspaceId: null,
    hideScheduled: false,
  })
  const [lastPointerEvent, setLastPointerEvent] = createState<
    | { readonly type: "workspace-enter"; readonly workspaceId: number }
    | { readonly type: "workspace-leave" | "popup-enter" | "popup-leave" }
    | null
  >(null)
  const popupController = new PopupController(
    {
      schedule: (callback, delayMs) =>
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
          callback()
          return GLib.SOURCE_REMOVE
        }),
      cancel: (id) => GLib.source_remove(id),
    },
    setPopupSnapshot,
  )

  let disposePopupRoot = () => {}
  let disposeBarRoot = () => {}

  const popup = requireGtkWindow(
    createRoot((dispose) => {
      disposePopupRoot = dispose
      return (
        <Gtk.Window
          application={application}
          name="workspace-popup"
          visible={createComputed(() => popupSnapshot().workspaceId !== null)}
          $={(self: Gtk.Window) => {
            const motion = new Gtk.EventControllerMotion()
            motion.connect("enter", () => {
              setLastPointerEvent({ type: "popup-enter" })
              popupController.popupEnter()
            })
            motion.connect("leave", () => {
              setLastPointerEvent({ type: "popup-leave" })
              popupController.popupLeave()
            })
            self.add_controller(motion)
          }}
        >
          <Gtk.Box class={workspacePopup}>
            <With value={popupSnapshot}>
              {(snapshot: PopupSnapshot) => {
                if (snapshot.workspaceId === null) return ""
                const sorted = createComputed(() =>
                  windowsForWorkspace(services.niri.state(), snapshot.workspaceId ?? -1),
                )
                createEffect(() => {
                  if (sorted().length === 0) popupController.reset()
                })
                return (
                  <Gtk.Box spacing={10}>
                    <For each={sorted}>
                      {(w: NiriWindow) => (
                        <Gtk.Image
                          {...iconForAppId(w.app_id)}
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
      )
    }),
  )

  Gtk4LayerShell.init_for_window(popup)
  Gtk4LayerShell.set_layer(popup, Gtk4LayerShell.Layer.OVERLAY)
  Gtk4LayerShell.set_namespace(popup, "yates-workspace-popup")
  Gtk4LayerShell.set_anchor(popup, Gtk4LayerShell.Edge.LEFT, true)
  Gtk4LayerShell.set_anchor(popup, Gtk4LayerShell.Edge.TOP, true)
  Gtk4LayerShell.set_monitor(popup, gdkmonitor)

  const showPopup = (ws: NiriWorkspace, btn: Gtk.Button) => {
    setLastPointerEvent({ type: "workspace-enter", workspaceId: ws.id })
    const count = windowsForWorkspace(services.niri.state(), ws.id).length
    if (count === 0) {
      popupController.workspaceEnter(ws.id, 0)
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
    popupController.workspaceEnter(ws.id, count)
  }
  const workspaceLeave = () => {
    setLastPointerEvent({ type: "workspace-leave" })
    popupController.workspaceLeave()
  }

  const win = requireGtkWindow(
    createRoot((dispose) => {
      disposeBarRoot = dispose
      return (
        <Gtk.Window application={application} name="bar">
          <Gtk.CenterBox
            class={vertical ? barVertical : bar}
            orientation={vertical ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL}
          >
            <Gtk.Box $type="start" spacing={10} orientation={gtkOrientation(orientation)}>
              <Workspaces
                gdkmonitor={gdkmonitor}
                orientation={orientation}
                services={services}
                onHover={showPopup}
                onLeave={workspaceLeave}
              />
              {!vertical && <WindowTitle services={services} />}
            </Gtk.Box>
            {vertical ? (
              <Gtk.Box $type="center" orientation={Gtk.Orientation.VERTICAL} class={clock}>
                <Gtk.Label label={services.now.as((now) => format(now, "HH"))} />
                <Gtk.Label label={services.now.as((now) => format(now, "mm"))} />
              </Gtk.Box>
            ) : (
              <Gtk.Label
                $type="center"
                class={clock}
                label={services.now.as((now) => format(now, "EEE MMM d  HH:mm"))}
              />
            )}
            <Gtk.Box $type="end" spacing={8} orientation={gtkOrientation(orientation)}>
              {services.systemIndicators && <SysTray orientation={orientation} />}
              {services.systemIndicators && <NetworkIcon />}
              {services.systemIndicators && <VolumeIcon />}
              {services.systemIndicators && <BatteryStatus orientation={orientation} />}
              <Gtk.Image iconName="system-shutdown-symbolic" pixelSize={16} />
            </Gtk.Box>
          </Gtk.CenterBox>
        </Gtk.Window>
      )
    }),
  )

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
  diagnosticLog("bar.created", { connector: gdkmonitor.connector ?? "unknown" })
  return {
    connector: gdkmonitor.connector ?? "unknown",
    win,
    popup,
    popupController,
    popupSnapshot: () => popupSnapshot(),
    lastPointerEvent: () => lastPointerEvent(),
    destroy: () => {
      popupController.reset()
      popup.destroy()
      win.destroy()
      disposePopupRoot()
      disposeBarRoot()
      diagnosticLog("bar.destroyed", { connector: gdkmonitor.connector ?? "unknown" })
    },
  }
}

export type BarHandle = ReturnType<typeof Bar>
