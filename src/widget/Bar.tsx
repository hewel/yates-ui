import Tray from "gi://AstalTray"
import Gdk from "gi://Gdk?version=4.0"
import Gtk from "gi://Gtk?version=4.0"
import Gtk4LayerShell from "gi://Gtk4LayerShell?version=1.0"
import Pango from "gi://Pango"

import {
  Accessor,
  For,
  createBinding,
  createComputed,
  createEffect,
  createExternal,
  createRoot,
} from "gnim"

import { diagnosticLog } from "../debug/log"
import { BarServices } from "../services/barServices"
import { PrivacyStatusState } from "../services/privacyStatusModel"
import { QuickSettingsState } from "../services/quickSettingsModel"
import {
  bar,
  barVertical,
  barVerticalSection,
  batteryStatus,
  batteryStatusVertical,
  batteryLabel,
  clock,
  quickSettingsStatus,
  quickSettingsStatusVertical,
  privacyCastLabel,
  privacyCastRow,
  privacyIndicator,
  privacyIndicatorVertical,
  privacyPopover,
  privacyStopButton,
  windowTitle,
  workspaceButton,
  workspaceButtonActive,
  workspaces,
  workspacesVertical,
} from "./Bar.css"
import {
  BarPresentation,
  BarWorkspacePresentation,
  projectBarPresentation,
} from "./bar/barPresentation"
import { BarLayoutSpec, BarOrientation, orientationPolicy } from "./bar/orientationPolicy"
import { QuickSettings, QuickSettingsDetail, QuickSettingsHandle } from "./bar/QuickSettings"
import { quickSettingsTrigger, quickSettingsTriggerVertical } from "./bar/QuickSettings.css"
import { WorkspacePopupHandle, createWorkspacePopup } from "./bar/WorkspacePopup"
import { PopupPointerEvent, WorkspacePopupEvent } from "./bar/workspacePopupSession"

function gtkOrientation(orientation: BarOrientation): Gtk.Orientation {
  return orientation === "vertical" ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL
}

function quickSettingsDirection(direction: "down" | "right"): Gtk.ArrowType {
  return direction === "right" ? Gtk.ArrowType.RIGHT : Gtk.ArrowType.DOWN
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
      class={layout.axis === "vertical" ? `${workspaces} ${workspacesVertical}` : workspaces}
      orientation={gtkOrientation(layout.axis)}
      spacing={8}
      marginTop={layout.workspaceMarginTop}
      halign={layout.axis === "vertical" ? Gtk.Align.CENTER : Gtk.Align.FILL}
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

function NetworkIcon({ state }: { state: Accessor<QuickSettingsState> }) {
  const icon = createComputed(() => {
    const quickSettings = state()
    if (quickSettings.wifi.available && quickSettings.wifi.enabled) {
      return quickSettings.wifi.iconName
    }
    if (quickSettings.wired.available && quickSettings.wired.activeConnectionId !== null) {
      return quickSettings.wired.iconName
    }
    return "network-offline-symbolic"
  })

  return <Gtk.Image iconName={icon} pixelSize={16} />
}

function VolumeIcon({ state }: { state: Accessor<QuickSettingsState> }) {
  return <Gtk.Image iconName={createComputed(() => state().audio.iconName)} pixelSize={16} />
}

function BatteryStatus({
  orientation,
  state,
}: {
  orientation: BarOrientation
  state: Accessor<QuickSettingsState>
}) {
  const battery = createComputed(() => state().battery)

  return (
    <Gtk.Box
      class={
        orientation === "vertical" ? `${batteryStatus} ${batteryStatusVertical}` : batteryStatus
      }
      spacing={orientation === "vertical" ? 2 : 4}
      orientation={gtkOrientation(orientation)}
      visible={createComputed(() => battery().available)}
      halign={orientation === "vertical" ? Gtk.Align.CENTER : Gtk.Align.FILL}
    >
      <Gtk.Image iconName={createComputed(() => battery().iconName)} pixelSize={16} />
      <Gtk.Label
        class={batteryLabel}
        label={createComputed(() => `${Math.round(battery().percentage * 100)}%`)}
      />
    </Gtk.Box>
  )
}

function QuickSettingsStatus({
  orientation,
  state,
  privacy,
  stopCast,
}: {
  orientation: BarOrientation
  state: Accessor<QuickSettingsState>
  privacy: Accessor<PrivacyStatusState>
  stopCast: (sessionId: number) => void
}) {
  return (
    <Gtk.Box
      class={
        orientation === "vertical"
          ? `${quickSettingsStatus} ${quickSettingsStatusVertical}`
          : quickSettingsStatus
      }
      spacing={orientation === "vertical" ? 2 : 6}
      orientation={gtkOrientation(orientation)}
      halign={orientation === "vertical" ? Gtk.Align.CENTER : Gtk.Align.FILL}
    >
      <PrivacyStatusIndicator orientation={orientation} state={privacy} stopCast={stopCast} />
      <NetworkIcon state={state} />
      <VolumeIcon state={state} />
      <BatteryStatus orientation={orientation} state={state} />
    </Gtk.Box>
  )
}

function PrivacyStatusIndicator({
  orientation,
  state,
  stopCast,
}: {
  orientation: BarOrientation
  state: Accessor<PrivacyStatusState>
  stopCast: (sessionId: number) => void
}) {
  // A Niri cast remains privacy-sensitive while paused, so it must keep the
  // indicator visible until the compositor removes the session.
  const casts = createComputed(() => state().casts)
  const screenSharingActive = createComputed(
    () => state().screenSharingAvailable && casts().length > 0,
  )

  return (
    <Gtk.Box spacing={orientation === "vertical" ? 2 : 6} orientation={gtkOrientation(orientation)}>
      <Gtk.MenuButton
        class={
          orientation === "vertical"
            ? `${privacyIndicator} ${privacyIndicatorVertical}`
            : privacyIndicator
        }
        alwaysShowArrow={false}
        tooltipText="Screen sharing"
        visible={screenSharingActive}
        $={(self: Gtk.MenuButton) => {
          self.update_property([Gtk.AccessibleProperty.LABEL], ["Screen sharing"])
        }}
      >
        <Gtk.Image iconName="screen-shared-symbolic" pixelSize={16} />
        <Gtk.Popover
          class={privacyPopover}
          position={orientation === "vertical" ? Gtk.PositionType.RIGHT : Gtk.PositionType.BOTTOM}
        >
          <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <For each={casts} id={(cast) => String(cast.streamId)}>
              {(cast) => (
                <Gtk.Box class={privacyCastRow} spacing={8}>
                  <Gtk.Label
                    class={privacyCastLabel}
                    label={cast.targetLabel}
                    xalign={0}
                    hexpand={true}
                    ellipsize={Pango.EllipsizeMode.END}
                    maxWidthChars={24}
                  />
                  <Gtk.Button
                    class={`${privacyStopButton} flat`}
                    label="Stop"
                    visible={cast.canStop}
                    onClicked={() => stopCast(cast.sessionId)}
                  />
                </Gtk.Box>
              )}
            </For>
          </Gtk.Box>
        </Gtk.Popover>
      </Gtk.MenuButton>
      <Gtk.Image
        iconName="microphone-sensitivity-high-symbolic"
        pixelSize={16}
        tooltipText="Microphone in use"
        visible={createComputed(() => state().microphone.available && state().microphone.active)}
      />
      <Gtk.Image
        iconName="camera-video-symbolic"
        pixelSize={16}
        tooltipText="Camera in use"
        visible={createComputed(() => state().camera.available && state().camera.active)}
      />
    </Gtk.Box>
  )
}

export interface CreateBarOptions {
  readonly monitor: Gdk.Monitor
  readonly application: Gtk.Application
  readonly orientation: BarOrientation
  readonly services: BarServices
  readonly setBarOrientation: (orientation: BarOrientation) => void
  readonly openSettings: () => void
}

export type BarInteraction = WorkspacePopupEvent

export interface BarSnapshot {
  readonly connector: string
  readonly orientation: BarOrientation
  readonly barVisible: boolean
  readonly popupVisible: boolean
  readonly popupWorkspaceId: number | null
  readonly quickSettingsVisible: boolean
  readonly quickSettingsDetail: QuickSettingsDetail | null
  /** @deprecated Kept until the debug D-Bus clients migrate to `quickSettingsDetail`. */
  readonly quickSettingsPage: "main" | QuickSettingsDetail
  readonly hideScheduled: boolean
  readonly lastPointerEvent: PopupPointerEvent | null
}

export interface BarInstance {
  dispatch(event: BarInteraction): void
  showQuickSettings(): void
  hideQuickSettings(): void
  openQuickSettingsDetail(detail: string | null): boolean
  /** @deprecated Use `openQuickSettingsDetail`. */
  navigateQuickSettings(page: string): boolean
  snapshot(): BarSnapshot
  destroy(): void
}

export function createBar(options: CreateBarOptions): BarInstance {
  const connector = options.monitor.connector ?? "unknown"
  const policy = orientationPolicy(options.orientation)
  let forwardPopupEvent = (_event: WorkspacePopupEvent) => {}
  let popup: WorkspacePopupHandle | null = null
  let quickSettings: QuickSettingsHandle | null = null

  const built = createRoot((dispose) => {
    const presentation = createComputed(() =>
      projectBarPresentation(options.services.niri.state(), connector),
    )
    const quickSettingsState = createExternal<QuickSettingsState>(
      options.services.quickSettings.snapshot(),
      (set) => options.services.quickSettings.subscribe(set),
    )
    const privacyStatus = createExternal<PrivacyStatusState>(
      options.services.privacyStatus.snapshot(),
      (set) => options.services.privacyStatus.subscribe(set),
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
          <Gtk.Box
            $type="start"
            class={layout.axis === "vertical" ? barVerticalSection : undefined}
            spacing={10}
            orientation={gtkOrientation(layout.axis)}
            halign={layout.axis === "vertical" ? Gtk.Align.CENTER : Gtk.Align.FILL}
          >
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
          <Gtk.Box
            $type="end"
            class={layout.axis === "vertical" ? barVerticalSection : undefined}
            spacing={8}
            orientation={gtkOrientation(layout.axis)}
            halign={layout.axis === "vertical" ? Gtk.Align.CENTER : Gtk.Align.FILL}
          >
            {options.services.systemIndicators && <SysTray orientation={options.orientation} />}
            <Gtk.MenuButton
              class={
                options.orientation === "vertical"
                  ? `${quickSettingsTrigger} ${quickSettingsTriggerVertical}`
                  : quickSettingsTrigger
              }
              direction={quickSettingsDirection(layout.quickSettingsDirection)}
              alwaysShowArrow={false}
              tooltipText="Quick Settings"
              widthRequest={options.orientation === "vertical" ? 32 : -1}
              $={(self: Gtk.MenuButton) => {
                self.update_property([Gtk.AccessibleProperty.LABEL], ["Quick Settings"])
              }}
            >
              <QuickSettingsStatus
                orientation={options.orientation}
                state={quickSettingsState}
                privacy={privacyStatus}
                stopCast={options.services.privacyStatus.stopCast}
              />
              <QuickSettings
                quickSettings={options.services.quickSettings}
                orientation={options.orientation}
                setBarOrientation={options.setBarOrientation}
                openSettings={options.openSettings}
                onReady={(handle) => {
                  quickSettings = handle
                }}
              />
            </Gtk.MenuButton>
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
    showQuickSettings: () => quickSettings?.show(),
    hideQuickSettings: () => quickSettings?.hide(),
    openQuickSettingsDetail: (detail) => quickSettings?.openDetail(detail) ?? false,
    navigateQuickSettings: (page) =>
      quickSettings?.openDetail(page === "main" ? null : page) ?? false,
    snapshot: () => {
      const popupObservation = popup?.observation()
      const quickSettingsDetail = quickSettings?.detail() ?? null
      return {
        connector,
        orientation: options.orientation,
        barVisible: built.window.visible,
        popupVisible: popupObservation?.visible ?? false,
        popupWorkspaceId: popupObservation?.workspaceId ?? null,
        quickSettingsVisible: quickSettings?.visible() ?? false,
        quickSettingsDetail,
        quickSettingsPage: quickSettingsDetail ?? "main",
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
