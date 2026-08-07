import Battery from "gi://AstalBattery"
import Network from "gi://AstalNetwork"
import Tray from "gi://AstalTray"
import Wp from "gi://AstalWp"
import Gdk from "gi://Gdk?version=4.0"
import Gtk from "gi://Gtk?version=4.0"
import Gtk4LayerShell from "gi://Gtk4LayerShell?version=1.0"
import Pango from "gi://Pango"

import { Accessor, For, createBinding, createComputed, createEffect, createRoot } from "gnim"

import { diagnosticLog } from "../debug/log"
import { BarServices } from "../services/barServices"
import {
  bar,
  barVertical,
  batteryLabel,
  clock,
  windowTitle,
  workspaceButton,
  workspaceButtonActive,
  workspaces,
} from "./Bar.css"
import {
  BarPresentation,
  BarWorkspacePresentation,
  projectBarPresentation,
} from "./bar/barPresentation"
import { BarLayoutSpec, BarOrientation, orientationPolicy } from "./bar/orientationPolicy"
import { WorkspacePopupHandle, createWorkspacePopup } from "./bar/WorkspacePopup"
import { PopupPointerEvent, WorkspacePopupEvent } from "./bar/workspacePopupSession"

function gtkOrientation(orientation: BarOrientation): Gtk.Orientation {
  return orientation === "vertical" ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL
}

function layerEdge(edge: "top" | "left" | "right" | "bottom"): Gtk4LayerShell.Edge {
  switch (edge) {
    case "top":
      return Gtk4LayerShell.Edge.TOP
    case "left":
      return Gtk4LayerShell.Edge.LEFT
    case "right":
      return Gtk4LayerShell.Edge.RIGHT
    case "bottom":
      return Gtk4LayerShell.Edge.BOTTOM
  }
}

function requireGtkWindow(value: unknown): Gtk.Window {
  if (value instanceof Gtk.Window) return value
  throw new Error("Gnim root did not construct a Gtk.Window")
}

function Workspaces({
  layout,
  presentation,
  services,
  onEvent,
  registerAnchor,
}: {
  layout: BarLayoutSpec
  presentation: Accessor<BarPresentation>
  services: BarServices
  onEvent: (event: WorkspacePopupEvent) => void
  registerAnchor: (workspaceId: number, button: Gtk.Button) => void
}) {
  return (
    <Gtk.Box
      class={workspaces}
      orientation={gtkOrientation(layout.axis)}
      spacing={8}
      marginTop={layout.workspaceMarginTop}
    >
      <For each={createComputed(() => presentation().workspaces)} id={(workspace) => workspace.id}>
        {(workspace: BarWorkspacePresentation) => (
          <Gtk.Button
            canFocus={false}
            class={createComputed(() =>
              presentation().workspaces.find((candidate) => candidate.id === workspace.id)?.focused
                ? `${workspaceButton} ${workspaceButtonActive}`
                : workspaceButton,
            )}
            onClicked={() => services.niri.focusWorkspace(workspace.id)}
            $={(self: Gtk.Button) => {
              registerAnchor(workspace.id, self)
              const motion = new Gtk.EventControllerMotion()
              motion.connect("enter", () =>
                onEvent({
                  type: "workspace-enter",
                  workspaceId: workspace.id,
                  origin: "pointer",
                }),
              )
              motion.connect("leave", () => onEvent({ type: "workspace-leave", origin: "pointer" }))
              self.add_controller(motion)
            }}
          >
            <Gtk.Label
              label={createComputed(
                () =>
                  presentation().workspaces.find((candidate) => candidate.id === workspace.id)
                    ?.label ?? workspace.label,
              )}
            />
          </Gtk.Button>
        )}
      </For>
    </Gtk.Box>
  )
}

function WindowTitle({ presentation }: { presentation: Accessor<BarPresentation> }) {
  const title = createComputed(() => presentation().focusedWindowTitle)

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

function SysTray({ orientation }: { orientation: BarOrientation }) {
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

function BatteryStatus({ orientation }: { orientation: BarOrientation }) {
  const battery = Battery.get_default()
  const percentage = createBinding(battery, "percentage")

  return (
    <Gtk.Box
      spacing={4}
      orientation={gtkOrientation(orientation)}
      visible={createBinding(battery, "isPresent")}
    >
      <Gtk.Image iconName={createBinding(battery, "batteryIconName")} pixelSize={16} />
      <Gtk.Label
        class={batteryLabel}
        label={percentage.as((value) => `${Math.round(value * 100)}%`)}
      />
    </Gtk.Box>
  )
}

export interface CreateBarOptions {
  readonly monitor: Gdk.Monitor
  readonly application: Gtk.Application
  readonly orientation: BarOrientation
  readonly services: BarServices
}

export type BarInteraction = WorkspacePopupEvent

export interface BarSnapshot {
  readonly connector: string
  readonly orientation: BarOrientation
  readonly barVisible: boolean
  readonly popupVisible: boolean
  readonly popupWorkspaceId: number | null
  readonly hideScheduled: boolean
  readonly lastPointerEvent: PopupPointerEvent | null
}

export interface BarInstance {
  dispatch(event: BarInteraction): void
  snapshot(): BarSnapshot
  destroy(): void
}

export function createBar(options: CreateBarOptions): BarInstance {
  const connector = options.monitor.connector ?? "unknown"
  const policy = orientationPolicy(options.orientation)
  let forwardPopupEvent = (_event: WorkspacePopupEvent) => {}
  let popup: WorkspacePopupHandle | null = null

  const built = createRoot((dispose) => {
    const presentation = createComputed(() =>
      projectBarPresentation(options.services.niri.state(), connector),
    )
    const layout = policy.layout(options.services.now.peek())
    const anchors = new Map<number, Gtk.Button>()
    createEffect(() => {
      const workspaceIds = new Set(presentation().workspaces.map((workspace) => workspace.id))
      for (const workspaceId of anchors.keys()) {
        if (!workspaceIds.has(workspaceId)) anchors.delete(workspaceId)
      }
    })

    const window = requireGtkWindow(
      <Gtk.Window application={options.application} name="bar">
        <Gtk.CenterBox
          class={layout.styleVariant === "vertical" ? barVertical : bar}
          orientation={gtkOrientation(layout.axis)}
        >
          <Gtk.Box $type="start" spacing={10} orientation={gtkOrientation(layout.axis)}>
            <Workspaces
              layout={layout}
              presentation={presentation}
              services={options.services}
              onEvent={(event) => forwardPopupEvent(event)}
              registerAnchor={(workspaceId, button) => anchors.set(workspaceId, button)}
            />
            {layout.showWindowTitle && <WindowTitle presentation={presentation} />}
          </Gtk.Box>
          {options.orientation === "vertical" ? (
            <Gtk.Box $type="center" orientation={Gtk.Orientation.VERTICAL} class={clock}>
              <Gtk.Label
                label={createComputed(
                  () => policy.layout(options.services.now()).clockLabels[0] ?? "",
                )}
              />
              <Gtk.Label
                label={createComputed(
                  () => policy.layout(options.services.now()).clockLabels[1] ?? "",
                )}
              />
            </Gtk.Box>
          ) : (
            <Gtk.Label
              $type="center"
              class={clock}
              label={createComputed(
                () => policy.layout(options.services.now()).clockLabels[0] ?? "",
              )}
            />
          )}
          <Gtk.Box $type="end" spacing={8} orientation={gtkOrientation(layout.axis)}>
            {options.services.systemIndicators && <SysTray orientation={options.orientation} />}
            {options.services.systemIndicators && <NetworkIcon />}
            {options.services.systemIndicators && <VolumeIcon />}
            {options.services.systemIndicators && (
              <BatteryStatus orientation={options.orientation} />
            )}
            <Gtk.Image iconName="system-shutdown-symbolic" pixelSize={16} />
          </Gtk.Box>
        </Gtk.CenterBox>
      </Gtk.Window>,
    )

    return {
      dispose,
      window,
      presentation,
      resolveAnchor: (workspaceId: number) => anchors.get(workspaceId),
    }
  })

  Gtk4LayerShell.init_for_window(built.window)
  Gtk4LayerShell.set_layer(built.window, Gtk4LayerShell.Layer.TOP)
  Gtk4LayerShell.set_namespace(built.window, "yates-bar")
  for (const anchor of policy.layout(options.services.now.peek()).barAnchors) {
    Gtk4LayerShell.set_anchor(built.window, layerEdge(anchor), true)
  }
  Gtk4LayerShell.auto_exclusive_zone_enable(built.window)
  Gtk4LayerShell.set_monitor(built.window, options.monitor)

  const ensurePopup = (): WorkspacePopupHandle => {
    popup ??= createWorkspacePopup({
      application: options.application,
      monitor: options.monitor,
      barWindow: built.window,
      policy,
      presentation: built.presentation,
      resolveAnchor: built.resolveAnchor,
      focusWindow: options.services.niri.focusWindow,
    })
    return popup
  }
  forwardPopupEvent = (event) => {
    if (!popup) {
      if (event.type !== "workspace-enter") return
      const workspace = built.presentation
        .peek()
        .workspaces.find((candidate) => candidate.id === event.workspaceId)
      if (!workspace || workspace.popupWindows.length === 0) return
    }
    ensurePopup().dispatch(event)
  }
  const pointerMotion = new Gtk.EventControllerMotion()
  pointerMotion.connect("motion", (_controller, x, y) => {
    forwardPopupEvent({ type: "pointer-motion", point: { x, y }, origin: "pointer" })
  })
  built.window.add_controller(pointerMotion)

  built.window.present()
  diagnosticLog("bar.created", { connector })

  return {
    dispatch: forwardPopupEvent,
    snapshot: () => {
      const popupObservation = popup?.observation()
      return {
        connector,
        orientation: options.orientation,
        barVisible: built.window.visible,
        popupVisible: popupObservation?.visible ?? false,
        popupWorkspaceId: popupObservation?.workspaceId ?? null,
        hideScheduled: popupObservation?.hideScheduled ?? false,
        lastPointerEvent: popupObservation?.lastPointerEvent ?? null,
      }
    },
    destroy: () => {
      popup?.destroy()
      built.window.destroy()
      built.dispose()
      diagnosticLog("bar.destroyed", { connector })
    },
  }
}
