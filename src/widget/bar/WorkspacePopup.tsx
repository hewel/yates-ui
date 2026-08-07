import Apps from "gi://AstalApps"
import Gdk from "gi://Gdk?version=4.0"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import Gtk from "gi://Gtk?version=4.0"
import Gtk4LayerShell from "gi://Gtk4LayerShell?version=1.0"

import { Accessor, For, createEffect, createRoot, createState } from "gnim"

import { popupWindow, workspacePopup } from "../Bar.css"
import { BarPopupWindowPresentation, BarPresentation } from "./barPresentation"
import { OrientationPolicy } from "./orientationPolicy"
import {
  WorkspacePopupEvent,
  WorkspacePopupSession,
  WorkspacePopupSnapshot,
} from "./workspacePopupSession"

const apps = new Apps.Apps()

function iconForAppId(appId: string | null): { iconName?: string; gicon?: Gio.Icon } {
  const fallback = { iconName: "application-x-executable-symbolic" }
  if (!appId) return fallback
  const id = appId.toLowerCase()
  const list = apps.get_list()
  const found =
    list.find((app) => app.entry?.toLowerCase() === `${id}.desktop`) ??
    list.find((app) => app.wmClass?.toLowerCase() === id) ??
    list.find((app) => app.name?.toLowerCase() === id)
  const icon = found?.iconName
  if (!icon) return fallback
  if (icon.includes("/")) return { gicon: Gio.FileIcon.new(Gio.File.new_for_path(icon)) }
  return { iconName: icon }
}

function requireGtkWindow(value: unknown): Gtk.Window {
  if (value instanceof Gtk.Window) return value
  throw new Error("Gnim root did not construct a Gtk.Window")
}

export interface WorkspacePopupOptions {
  readonly application: Gtk.Application
  readonly monitor: Gdk.Monitor
  readonly barWindow: Gtk.Window
  readonly policy: OrientationPolicy
  readonly presentation: Accessor<BarPresentation>
  readonly resolveAnchor: (workspaceId: number) => Gtk.Button | undefined
}

export interface WorkspacePopupObservation extends WorkspacePopupSnapshot {
  readonly visible: boolean
}

export interface WorkspacePopupHandle {
  dispatch(event: WorkspacePopupEvent): void
  observation(): WorkspacePopupObservation
  destroy(): void
}

export function createWorkspacePopup(options: WorkspacePopupOptions): WorkspacePopupHandle {
  const [visible, setVisible] = createState(false)
  const [renderedWindows, setRenderedWindows] = createState<
    ReadonlyArray<BarPopupWindowPresentation>
  >([])
  let forwardEvent = (_event: WorkspacePopupEvent) => {}
  let synchronize = () => {}
  let disposeRoot = () => {}

  const popup = requireGtkWindow(
    createRoot((dispose) => {
      disposeRoot = dispose
      createEffect(() => {
        options.presentation()
        synchronize()
      })

      return (
        <Gtk.Window
          application={options.application}
          name="workspace-popup"
          class={popupWindow}
          visible={visible}
          $={(self: Gtk.Window) => {
            const motion = new Gtk.EventControllerMotion()
            motion.connect("enter", () => forwardEvent({ type: "popup-enter", origin: "pointer" }))
            motion.connect("leave", () => forwardEvent({ type: "popup-leave", origin: "pointer" }))
            self.add_controller(motion)
          }}
        >
          <Gtk.Box class={workspacePopup}>
            <Gtk.Box spacing={10}>
              <For each={renderedWindows}>
                {(window: BarPopupWindowPresentation) => (
                  <Gtk.Image
                    {...iconForAppId(window.appId)}
                    pixelSize={24}
                    tooltipText={window.title ?? undefined}
                  />
                )}
              </For>
            </Gtk.Box>
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
  Gtk4LayerShell.set_monitor(popup, options.monitor)

  const session = new WorkspacePopupSession<ReadonlyArray<BarPopupWindowPresentation>>({
    timer: {
      schedule: (callback, delayMs) =>
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
          callback()
          return GLib.SOURCE_REMOVE
        }),
      cancel: (id) => GLib.source_remove(id),
    },
    readContent: (workspaceId) =>
      options.presentation().workspaces.find((workspace) => workspace.id === workspaceId)
        ?.popupWindows ?? null,
    hasContent: (content) => content.length > 0,
    resolveAnchor: (workspaceId) => {
      const anchor = options.resolveAnchor(workspaceId)
      if (!anchor) return null
      const [computed, bounds] = anchor.compute_bounds(options.barWindow)
      if (!computed) return null
      return {
        x: bounds.get_x(),
        y: bounds.get_y(),
        width: bounds.get_width(),
        height: bounds.get_height(),
      }
    },
    view: {
      render: setRenderedWindows,
      measure: () => {
        const [, width] = popup.measure(Gtk.Orientation.HORIZONTAL, -1)
        const [, height] = popup.measure(Gtk.Orientation.VERTICAL, -1)
        return { width, height }
      },
      resize: ({ width, height }) => popup.set_default_size(width, height),
      position: ({ marginLeft, marginTop }) => {
        Gtk4LayerShell.set_margin(popup, Gtk4LayerShell.Edge.LEFT, marginLeft)
        Gtk4LayerShell.set_margin(popup, Gtk4LayerShell.Edge.TOP, marginTop)
      },
      show: () => setVisible(true),
    },
    policy: options.policy,
    onChange: (nextSnapshot) => {
      if (nextSnapshot.workspaceId === null) setVisible(false)
    },
  })
  forwardEvent = (event) => session.dispatch(event)
  synchronize = () => session.synchronize()

  return {
    dispatch: (event) => session.dispatch(event),
    observation: () => ({ ...session.snapshot(), visible: popup.visible }),
    destroy: () => {
      session.destroy()
      popup.destroy()
      disposeRoot()
    },
  }
}
