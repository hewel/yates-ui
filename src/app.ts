import Gdk from "gi://Gdk?version=4.0"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import Gtk from "gi://Gtk?version=4.0"

import style from "virtual:vanilla-bundle-url"

import { startDebugControl } from "./debug/control"
import { diagnosticLog } from "./debug/log"
import { createBarServices } from "./services/barServices"
import { createAppSettings } from "./settings/appSettings"
import { BarInstance, createBar } from "./widget/Bar"
import { SettingsWindowHandle, createSettingsWindow } from "./widget/SettingsWindow"
import { WindowRegistry } from "./windowRegistry"

const app = new Gtk.Application({
  application_id: GLib.getenv("YATES_APPLICATION_ID") ?? "me.pigmint.yates-ui",
})
const services = createBarServices()
const settings = createAppSettings()
const monitorByConnector = new Map<string, Gdk.Monitor>()
let settingsWindow: SettingsWindowHandle | null = null

function showSettings(): void {
  settingsWindow ??= createSettingsWindow({
    application: app,
    barOrientation: settings.barOrientation,
    setBarOrientation: settings.setBarOrientation,
  })
  settingsWindow.show()
}

const registry = new WindowRegistry<BarInstance>((connector) => {
  const monitor = monitorByConnector.get(connector)
  if (!monitor) throw new Error(`Monitor disappeared during reconciliation: ${connector}`)
  return createBar({
    monitor,
    application: app,
    orientation: settings.barOrientation.peek(),
    services,
    openSettings: showSettings,
  })
})

let activationCount = 0
let cssLoaded = false
let monitorsChangedSignal = 0
let activeDebugConnector: string | null = null
let activeDisplay: Gdk.Display | null = null
let orientationReconcileSource = 0

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
  activeDisplay = display

  loadCss(display)
  reconcileMonitors(display)

  const monitors = display.get_monitors()
  if (monitorsChangedSignal === 0) {
    monitorsChangedSignal = monitors.connect("items-changed", () => reconcileMonitors(display))
  }
})

const unsubscribeOrientation = settings.barOrientation.subscribe(() => {
  if (!activeDisplay || registry.connectors().length === 0) return
  if (orientationReconcileSource !== 0) GLib.source_remove(orientationReconcileSource)
  orientationReconcileSource = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
    orientationReconcileSource = 0
    if (!activeDisplay) return GLib.SOURCE_REMOVE
    registry.destroy()
    reconcileMonitors(activeDisplay)
    diagnosticLog("settings.bar-orientation.changed", {
      orientation: settings.barOrientation.peek(),
    })
    return GLib.SOURCE_REMOVE
  })
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
      settings: {
        visible: settingsWindow?.visible() ?? false,
        barOrientation: settings.barOrientation.peek(),
      },
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
        const bar = handle?.snapshot()
        return {
          connector,
          orientation: bar?.orientation ?? settings.barOrientation.peek(),
          barVisible: bar?.barVisible ?? false,
          popupVisible: bar?.popupVisible ?? false,
          popupWorkspaceId: bar?.popupWorkspaceId ?? null,
          hideScheduled: bar?.hideScheduled ?? false,
          lastPointerEvent: bar?.lastPointerEvent ?? null,
        }
      }),
    })
  },
  workspaceEnter: (output, workspaceId) => {
    const handle = registry.get(output)
    if (!handle) return JSON.stringify({ ok: false, error: "unknown-output" })
    activeDebugConnector = output
    handle.dispatch({ type: "workspace-enter", workspaceId, origin: "debug" })
    return ok()
  },
  workspaceLeave: () => {
    const handle = activeDebugConnector ? registry.get(activeDebugConnector) : undefined
    if (!handle) return noActiveBar()
    handle.dispatch({ type: "workspace-leave", origin: "debug" })
    return ok()
  },
  popupEnter: () => {
    const handle = activeDebugConnector ? registry.get(activeDebugConnector) : undefined
    if (!handle) return noActiveBar()
    handle.dispatch({ type: "popup-enter", origin: "debug" })
    return ok()
  },
  popupLeave: () => {
    const handle = activeDebugConnector ? registry.get(activeDebugConnector) : undefined
    if (!handle) return noActiveBar()
    handle.dispatch({ type: "popup-leave", origin: "debug" })
    return ok()
  },
  openSettings: () => {
    showSettings()
    return ok()
  },
  setBarOrientation: (orientation) => {
    if (orientation !== "vertical" && orientation !== "horizontal") {
      return JSON.stringify({ ok: false, error: "invalid-orientation" })
    }
    settings.setBarOrientation(orientation)
    return ok()
  },
  reset: () => {
    for (const connector of registry.connectors()) {
      registry.get(connector)?.dispatch({ type: "reset", origin: "debug" })
    }
    activeDebugConnector = null
    return ok()
  },
})

app.connect("shutdown", () => {
  if (orientationReconcileSource !== 0) GLib.source_remove(orientationReconcileSource)
  orientationReconcileSource = 0
  unsubscribeOrientation()
  settingsWindow?.destroy()
  settingsWindow = null
  debugControl?.stop()
  registry.destroy()
  services.stop()
  settings.flush()
  diagnosticLog("app.shutdown")
})

app.run([])
