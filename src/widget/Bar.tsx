import GLib from "gi://GLib"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import Gtk4LayerShell from "gi://Gtk4LayerShell?version=1.0"
import Pango from "gi://Pango"

import Niri from "gi://AstalNiri"
import Tray from "gi://AstalTray"
import Network from "gi://AstalNetwork"
import Battery from "gi://AstalBattery"
import Wp from "gi://AstalWp"

import { format } from "date-fns"
import { Accessor, For, createBinding, createComputed, createRoot, createState } from "gnim"

import {
  activities,
  bar,
  batteryLabel,
  clock,
  windowTitle,
  workspaceButton,
  workspaceButtonActive,
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

function Workspaces({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  const workspaces = createBinding(niri, "workspaces")
  const focused = createBinding(niri, "focusedWorkspace")
  const mine = createComputed(() =>
    workspaces().filter((ws) => ws.output === gdkmonitor.connector),
  )

  return (
    <Gtk.Box spacing={6}>
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

function SysTray() {
  const tray = Tray.get_default()
  const items = createBinding(tray, "items")

  return (
    <Gtk.Box spacing={8}>
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

function BatteryStatus() {
  const bat = Battery.get_default()
  const pct = createBinding(bat, "percentage")

  return (
    <Gtk.Box spacing={4} visible={createBinding(bat, "isPresent")}>
      <Gtk.Image iconName={createBinding(bat, "batteryIconName")} pixelSize={16} />
      <Gtk.Label class={batteryLabel} label={pct.as((p) => `${Math.round(p * 100)}%`)} />
    </Gtk.Box>
  )
}

export default function Bar(gdkmonitor: Gdk.Monitor, application: Gtk.Application) {
  const win = createRoot(() => (
    <Gtk.Window application={application} name="bar">
      <Gtk.CenterBox class={bar}>
        <Gtk.Box $type="start" spacing={10}>
          <Gtk.Label class={activities} label="Activities" />
          <Workspaces gdkmonitor={gdkmonitor} />
          <WindowTitle />
        </Gtk.Box>
        <Gtk.Label $type="center" class={clock} label={clockLabel} />
        <Gtk.Box $type="end" spacing={8}>
          <SysTray />
          <NetworkIcon />
          <VolumeIcon />
          <BatteryStatus />
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
  Gtk4LayerShell.set_anchor(win, Gtk4LayerShell.Edge.RIGHT, true)
  Gtk4LayerShell.auto_exclusive_zone_enable(win)
  Gtk4LayerShell.set_monitor(win, gdkmonitor)

  win.present()
  return win
}
