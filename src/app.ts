import Gdk from "gi://Gdk?version=4.0"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import Gtk from "gi://Gtk?version=4.0"

import style from "virtual:vanilla-bundle-url"

import { startDebugControl } from "./debug/control"
import { diagnosticLog } from "./debug/log"
import { windowsForWorkspace } from "./niri/state"
import { createBarServices } from "./services/barServices"
import Bar, { BarHandle } from "./widget/Bar"
import { WindowRegistry } from "./windowRegistry"

const BAR_ORIENTATION = "vertical"

const app = new Gtk.Application({
  application_id: GLib.getenv("YATES_APPLICATION_ID") ?? "me.pigmint.yates-ui",
})
const services = createBarServices()
const monitorByConnector = new Map<string, Gdk.Monitor>()
const registry = new WindowRegistry<BarHandle>((connector) => {
  const monitor = monitorByConnector.get(connector)
  if (!monitor) throw new Error(`Monitor disappeared during reconciliation: ${connector}`)
  return Bar(monitor, app, BAR_ORIENTATION, services)
})

let activationCount = 0
let cssLoaded = false
let monitorsChangedSignal = 0
let activeDebugConnector: string | null = null

function loadCss(display: Gdk.Display) {
  if (!style || cssLoaded) return

  const provider = new Gtk.CssProvider()
  provider.connect("parsing-error", (_provider, _section, error) => {
    diagnosticLog("css.parsing.failed", { error: error.message })
  })
  provider.load_from_path(style)
  Gtk.StyleContext.add_provider_for_display(
    display,
    provider,
    // above USER (800) so the bar's look is not overridden by ~/.config/gtk-4.0/gtk.css themes
    Gtk.STYLE_PROVIDER_PRIORITY_USER + 1,
  )
  cssLoaded = true
}

function reconcileMonitors(display: Gdk.Display): void {
  monitorByConnector.clear()
  const connectors: string[] = []
  const monitors = display.get_monitors()
  for (let i = 0; i < monitors.get_n_items(); i++) {
    const monitor = monitors.get_item(i)
    if (!(monitor instanceof Gdk.Monitor)) continue
    const connector = monitor.connector ?? `monitor-${i}`
    monitorByConnector.set(connector, monitor)
    connectors.push(connector)
  }
  registry.reconcile(connectors)
  diagnosticLog("app.monitors.reconciled", {
    activationCount,
    outputs: connectors.length,
    bars: registry.connectors().length,
  })
}

app.connect("activate", () => {
  activationCount += 1
  const display = Gdk.Display.get_default()
  if (!display) return

  loadCss(display)
  reconcileMonitors(display)

  const monitors = display.get_monitors()
  if (monitorsChangedSignal === 0) {
    monitorsChangedSignal = monitors.connect("items-changed", () => reconcileMonitors(display))
  }
})

const ok = () => JSON.stringify({ ok: true })
const noActiveBar = () => JSON.stringify({ ok: false, error: "no-active-bar" })
const debugControl = startDebugControl({
  snapshot: () => {
    const state = services.niri.state.peek()
    return JSON.stringify({
      version: 1,
      ready: registry.connectors().length > 0,
      pid: new Gio.Credentials().get_unix_pid(),
      activationCount,
      niri: {
        connected: services.niri.connected(),
        sequence: state.sequence,
        workspaceIds: state.workspaces.map((workspace) => workspace.id),
        windowIds: state.windows.map((window) => window.id),
        focusedWorkspaceId: state.focusedWorkspaceId,
        focusedWindowId: state.focusedWindowId,
      },
      outputs: registry.connectors().map((connector) => {
        const handle = registry.get(connector)
        const popup = handle?.popupSnapshot()
        return {
          connector,
          barVisible: handle?.win.visible ?? false,
          popupVisible: handle?.popup.visible ?? false,
          popupWorkspaceId: popup?.workspaceId ?? null,
          hideScheduled: popup?.hideScheduled ?? false,
          lastPointerEvent: handle?.lastPointerEvent() ?? null,
        }
      }),
    })
  },
  workspaceEnter: (output, workspaceId) => {
    const handle = registry.get(output)
    if (!handle) return JSON.stringify({ ok: false, error: "unknown-output" })
    activeDebugConnector = output
    handle.popupController.workspaceEnter(
      workspaceId,
      windowsForWorkspace(services.niri.state.peek(), workspaceId).length,
    )
    return ok()
  },
  workspaceLeave: () => {
    const handle = activeDebugConnector ? registry.get(activeDebugConnector) : undefined
    if (!handle) return noActiveBar()
    handle.popupController.workspaceLeave()
    return ok()
  },
  popupEnter: () => {
    const handle = activeDebugConnector ? registry.get(activeDebugConnector) : undefined
    if (!handle) return noActiveBar()
    handle.popupController.popupEnter()
    return ok()
  },
  popupLeave: () => {
    const handle = activeDebugConnector ? registry.get(activeDebugConnector) : undefined
    if (!handle) return noActiveBar()
    handle.popupController.popupLeave()
    return ok()
  },
  reset: () => {
    for (const connector of registry.connectors()) {
      registry.get(connector)?.popupController.reset()
    }
    activeDebugConnector = null
    return ok()
  },
})

app.connect("shutdown", () => {
  debugControl?.stop()
  registry.destroy()
  services.stop()
  diagnosticLog("app.shutdown")
})

app.run([])
