import GObject from "gi://GObject"
import Gtk from "gi://Gtk?version=4.0"
import Pango from "gi://Pango"

import { Accessor, For, createComputed, createExternal, createState, onCleanup } from "gnim"

import {
  QuickSettingsModule,
  QuickSettingsState,
  SessionAction,
} from "../../services/quickSettingsModel"
import { BarOrientation } from "../../settings/appSettingsModel"
import {
  quickSettingsAction,
  quickSettingsActionGroup,
  quickSettingsBackButton,
  quickSettingsBattery,
  quickSettingsBatteryValue,
  quickSettingsChoice,
  quickSettingsConfirmation,
  quickSettingsDetailRow,
  quickSettingsDetails,
  quickSettingsEmptyState,
  quickSettingsError,
  quickSettingsFooterButton,
  quickSettingsHeader,
  quickSettingsIcon,
  quickSettingsList,
  quickSettingsMain,
  quickSettingsPanel,
  quickSettingsPopover,
  quickSettingsScroller,
  quickSettingsSlider,
  quickSettingsSplitTile,
  quickSettingsSplitTileArrow,
  quickSettingsSplitTilePrimary,
  quickSettingsSubtitle,
  quickSettingsTileGrid,
  quickSettingsTileIcon,
  quickSettingsTileLabel,
  quickSettingsTilePrimary,
  quickSettingsTileText,
  quickSettingsTitle,
  quickSettingsTopRow,
} from "./QuickSettings.css"

export type QuickSettingsPage =
  | "main"
  | "wifi"
  | "bluetooth"
  | "audio"
  | "power-profile"
  | "orientation"
  | "session-confirmation"

function isPage(value: string): value is QuickSettingsPage {
  switch (value) {
    case "main":
    case "wifi":
    case "bluetooth":
    case "audio":
    case "power-profile":
    case "orientation":
    case "session-confirmation":
      return true
    default:
      return false
  }
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

function sessionLabel(action: SessionAction): string {
  switch (action) {
    case "suspend":
      return "Suspend"
    case "reboot":
      return "Restart"
    case "power-off":
      return "Power Off"
  }
}

function DetailHeader({
  title,
  onBack,
  actionIconName,
  actionTooltip,
  actionSensitive,
  onAction,
}: {
  title: string
  onBack: () => void
  actionIconName?: string
  actionTooltip?: string
  actionSensitive?: Accessor<boolean>
  onAction?: () => void
}) {
  return (
    <Gtk.Box class={quickSettingsHeader} orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
      <Gtk.Button
        class={`${quickSettingsBackButton} flat`}
        iconName="go-previous-symbolic"
        tooltipText="Back"
        onClicked={onBack}
        $={(self: Gtk.Button) => {
          self.update_property([Gtk.AccessibleProperty.LABEL], ["Back"])
        }}
      />
      <Gtk.Label class={quickSettingsTitle} label={title} xalign={0} hexpand={true} />
      {actionIconName && onAction && (
        <Gtk.Button
          class={`${quickSettingsBackButton} flat`}
          iconName={actionIconName}
          tooltipText={actionTooltip}
          sensitive={actionSensitive}
          onClicked={onAction}
          $={(self: Gtk.Button) => {
            self.update_property([Gtk.AccessibleProperty.LABEL], [actionTooltip ?? "Page action"])
          }}
        />
      )}
    </Gtk.Box>
  )
}

function DetailRow({
  iconName,
  title,
  subtitle,
  statusIconName,
  active,
  sensitive,
  visible,
  onClicked,
}: {
  iconName: string
  title: string
  subtitle?: string | Accessor<string>
  statusIconName?: string
  active?: Accessor<boolean>
  sensitive?: Accessor<boolean>
  visible?: Accessor<boolean>
  onClicked: () => void
}) {
  return (
    <Gtk.ListBoxRow selectable={false} activatable={false} visible={visible}>
      <Gtk.Button
        class={
          active?.as((isActive) =>
            isActive ? `${quickSettingsDetailRow} flat active` : `${quickSettingsDetailRow} flat`,
          ) ?? `${quickSettingsDetailRow} flat`
        }
        sensitive={sensitive}
        onClicked={onClicked}
      >
        <Gtk.Box spacing={12}>
          <Gtk.Image
            class={quickSettingsIcon}
            iconName={iconName}
            pixelSize={18}
            widthRequest={20}
            halign={Gtk.Align.CENTER}
          />
          <Gtk.Box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={2}
            hexpand={true}
            valign={Gtk.Align.CENTER}
          >
            <Gtk.Label
              label={title}
              xalign={0}
              ellipsize={Pango.EllipsizeMode.END}
              maxWidthChars={32}
            />
            {subtitle && (
              <Gtk.Label
                class={quickSettingsSubtitle}
                label={subtitle}
                xalign={0}
                ellipsize={Pango.EllipsizeMode.END}
                maxWidthChars={32}
              />
            )}
          </Gtk.Box>
          {statusIconName && <Gtk.Image iconName={statusIconName} pixelSize={14} />}
          {active && (
            <Gtk.Image iconName="object-select-symbolic" pixelSize={16} visible={active} />
          )}
        </Gtk.Box>
      </Gtk.Button>
    </Gtk.ListBoxRow>
  )
}

function MainTile({
  iconName,
  label,
  active,
  sensitive,
  visible,
  onClicked,
}: {
  iconName: Accessor<string>
  label: Accessor<string>
  active: Accessor<boolean>
  sensitive?: Accessor<boolean>
  visible?: Accessor<boolean>
  onClicked: () => void
}) {
  return (
    <Gtk.ToggleButton
      class={quickSettingsTilePrimary}
      active={active}
      sensitive={sensitive}
      visible={visible}
      hexpand={true}
      tooltipText={label}
      onToggled={(self) => {
        if (self.active !== active()) onClicked()
      }}
    >
      <Gtk.Box class={quickSettingsTileText} spacing={8} hexpand={true} valign={Gtk.Align.CENTER}>
        <Gtk.Image
          class={quickSettingsTileIcon}
          iconName={iconName}
          pixelSize={18}
          widthRequest={20}
          halign={Gtk.Align.CENTER}
        />
        <Gtk.Label
          class={quickSettingsTileLabel}
          label={label}
          xalign={0}
          hexpand={true}
          ellipsize={Pango.EllipsizeMode.END}
          maxWidthChars={14}
        />
      </Gtk.Box>
    </Gtk.ToggleButton>
  )
}

function SplitTile({
  iconName,
  label,
  subtitle,
  active,
  sensitive,
  visible,
  onToggle,
  onDetails,
}: {
  iconName: Accessor<string>
  label: Accessor<string>
  subtitle: Accessor<string>
  active: Accessor<boolean>
  sensitive?: Accessor<boolean>
  visible?: Accessor<boolean>
  onToggle: () => void
  onDetails: () => void
}) {
  return (
    <Gtk.Box class={quickSettingsSplitTile} spacing={0} visible={visible} hexpand={true}>
      <Gtk.ToggleButton
        class={quickSettingsSplitTilePrimary}
        active={active}
        sensitive={sensitive}
        hexpand={true}
        tooltipText={label}
        onToggled={(self) => {
          if (self.active !== active()) onToggle()
        }}
      >
        <Gtk.Box spacing={8} hexpand={true} valign={Gtk.Align.CENTER}>
          <Gtk.Image
            class={quickSettingsTileIcon}
            iconName={iconName}
            pixelSize={18}
            widthRequest={20}
            halign={Gtk.Align.CENTER}
          />
          <Gtk.Box
            class={quickSettingsTileText}
            orientation={Gtk.Orientation.VERTICAL}
            spacing={0}
            hexpand={true}
            valign={Gtk.Align.CENTER}
          >
            <Gtk.Label
              class={quickSettingsTileLabel}
              label={label}
              xalign={0}
              ellipsize={Pango.EllipsizeMode.END}
              maxWidthChars={11}
            />
            <Gtk.Label
              class={quickSettingsSubtitle}
              label={subtitle}
              xalign={0}
              ellipsize={Pango.EllipsizeMode.END}
              maxWidthChars={11}
            />
          </Gtk.Box>
        </Gtk.Box>
      </Gtk.ToggleButton>
      <Gtk.Button
        class={active.as((isActive) =>
          isActive
            ? `${quickSettingsSplitTileArrow} flat active`
            : `${quickSettingsSplitTileArrow} flat`,
        )}
        sensitive={sensitive}
        iconName="go-next-symbolic"
        tooltipText={label.as((value) => `${value} details`)}
        onClicked={onDetails}
        $={(self: Gtk.Button) => {
          self.update_property([Gtk.AccessibleProperty.LABEL], [`${label()} details`])
        }}
      />
    </Gtk.Box>
  )
}

export interface QuickSettingsHandle {
  show(): void
  hide(): void
  visible(): boolean
  page(): QuickSettingsPage
  navigate(page: string): boolean
}

export interface QuickSettingsOptions {
  readonly quickSettings: QuickSettingsModule
  readonly orientation: BarOrientation
  readonly setBarOrientation: (orientation: BarOrientation) => void
  readonly openSettings: () => void
  readonly onReady: (handle: QuickSettingsHandle) => void
}

export function QuickSettings(options: QuickSettingsOptions) {
  let popover: Gtk.Popover | null = null
  const state = createExternal<QuickSettingsState>(options.quickSettings.snapshot(), (set) =>
    options.quickSettings.subscribe(set),
  )
  const [page, setPage] = createState<QuickSettingsPage>("main")
  const [sessionAction, setSessionAction] = createState<SessionAction | null>(null)
  const isPageVisible = (name: QuickSettingsPage) => createComputed(() => page() === name)
  const navigate = (target: string): boolean => {
    if (!isPage(target)) return false
    setPage(target)
    return true
  }
  const closeAndReset = (popover: Gtk.Popover) => {
    popover.popdown()
    setPage("main")
    setSessionAction(null)
  }

  return (
    <Gtk.Popover
      class={quickSettingsPopover}
      autohide={true}
      hasArrow={false}
      onClosed={() => {
        setPage("main")
        setSessionAction(null)
      }}
      $={(self: Gtk.Popover) => {
        popover = self
        options.onReady({
          show: () => self.popup(),
          hide: () => self.popdown(),
          visible: () => self.visible,
          page: () => page.peek(),
          navigate,
        })
      }}
    >
      <Gtk.Box class={quickSettingsPanel} orientation={Gtk.Orientation.VERTICAL}>
        <Gtk.Box
          class={quickSettingsMain}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={14}
          visible={isPageVisible("main")}
        >
          <Gtk.Box class={quickSettingsTopRow} spacing={8}>
            <Gtk.Box class={quickSettingsActionGroup} spacing={8}>
              <Gtk.Box
                class={quickSettingsBattery}
                spacing={5}
                visible={createComputed(() => state().battery.available)}
              >
                <Gtk.Image
                  iconName={createComputed(() => state().battery.iconName)}
                  pixelSize={16}
                />
                <Gtk.Label
                  class={quickSettingsBatteryValue}
                  label={createComputed(() => percentage(state().battery.percentage))}
                />
              </Gtk.Box>
              <Gtk.Button
                class={`${quickSettingsAction} flat`}
                iconName="applets-screenshooter-symbolic"
                tooltipText="Take screenshot"
                sensitive={createComputed(() => state().session.screenshot)}
                onClicked={() => options.quickSettings.dispatch({ type: "take-screenshot" })}
                $={(self: Gtk.Button) =>
                  self.update_property([Gtk.AccessibleProperty.LABEL], ["Take screenshot"])
                }
              />
              <Gtk.Button
                class={`${quickSettingsAction} flat`}
                iconName="preferences-system-symbolic"
                tooltipText="Settings"
                onClicked={() => {
                  if (popover) closeAndReset(popover)
                  options.openSettings()
                }}
                $={(self: Gtk.Button) =>
                  self.update_property([Gtk.AccessibleProperty.LABEL], ["Settings"])
                }
              />
            </Gtk.Box>
            <Gtk.Box hexpand={true} />
            <Gtk.Box class={quickSettingsActionGroup} spacing={8}>
              <Gtk.Button
                class={`${quickSettingsAction} flat`}
                iconName="system-lock-screen-symbolic"
                tooltipText="Lock screen"
                sensitive={createComputed(() => state().session.lock)}
                onClicked={() => options.quickSettings.dispatch({ type: "lock" })}
                $={(self: Gtk.Button) =>
                  self.update_property([Gtk.AccessibleProperty.LABEL], ["Lock screen"])
                }
              />
              <Gtk.Button
                class={`${quickSettingsAction} flat`}
                iconName="system-shutdown-symbolic"
                tooltipText="Power options"
                visible={createComputed(
                  () =>
                    state().session.suspend || state().session.reboot || state().session.powerOff,
                )}
                onClicked={() => navigate("session-confirmation")}
                $={(self: Gtk.Button) =>
                  self.update_property([Gtk.AccessibleProperty.LABEL], ["Power options"])
                }
              />
            </Gtk.Box>
          </Gtk.Box>

          <Gtk.Box spacing={10} visible={createComputed(() => state().audio.available)}>
            <Gtk.Image iconName={createComputed(() => state().audio.iconName)} pixelSize={20} />
            <Gtk.Scale
              class={quickSettingsSlider}
              orientation={Gtk.Orientation.HORIZONTAL}
              hexpand={true}
              drawValue={false}
              tooltipText={createComputed(() => `Volume ${percentage(state().audio.volume)}`)}
              onValueChanged={(self) => {
                options.quickSettings.dispatch({ type: "set-volume", value: self.get_value() })
              }}
              $={(self: Gtk.Scale) => {
                self.set_range(0, 1)
                self.set_increments(0.01, 0.1)
                self.set_value(state().audio.volume)
                onCleanup(
                  state.subscribe(() => {
                    self.set_value(state().audio.volume)
                  }),
                )
              }}
            />
            <Gtk.Button
              class={`${quickSettingsFooterButton} flat`}
              iconName="go-next-symbolic"
              tooltipText="Sound output"
              onClicked={() => navigate("audio")}
              $={(self: Gtk.Button) =>
                self.update_property([Gtk.AccessibleProperty.LABEL], ["Sound output"])
              }
            />
          </Gtk.Box>

          <Gtk.FlowBox
            class={quickSettingsTileGrid}
            columnSpacing={12}
            rowSpacing={12}
            homogeneous={true}
            minChildrenPerLine={2}
            maxChildrenPerLine={2}
            selectionMode={Gtk.SelectionMode.NONE}
          >
            <Gtk.FlowBoxChild
              visible={createComputed(() => state().wired.available || state().wifi.available)}
            >
              <SplitTile
                iconName={createComputed(() =>
                  !state().wifi.available && state().wired.connected
                    ? state().wired.iconName
                    : state().wifi.iconName,
                )}
                label={createComputed(() =>
                  !state().wifi.available && state().wired.connected ? "Wired" : "Wi-Fi",
                )}
                subtitle={createComputed(() => {
                  if (state().wired.connected) return "Connected"
                  return (
                    state().wifi.activeNetworkName ??
                    (state().wifi.enabled ? "Not connected" : "Off")
                  )
                })}
                active={createComputed(() => state().wired.connected || state().wifi.enabled)}
                sensitive={createComputed(() => state().wifi.available)}
                onToggle={() => options.quickSettings.dispatch({ type: "toggle-wifi" })}
                onDetails={() => navigate("wifi")}
              />
            </Gtk.FlowBoxChild>
            <Gtk.FlowBoxChild visible={createComputed(() => state().bluetooth.available)}>
              <SplitTile
                iconName={createComputed(() =>
                  state().bluetooth.enabled
                    ? "bluetooth-active-symbolic"
                    : "bluetooth-disabled-symbolic",
                )}
                label={createComputed(() => "Bluetooth")}
                subtitle={createComputed(() => {
                  const connected = state().bluetooth.devices.find((device) => device.connected)
                  return connected?.name ?? (state().bluetooth.enabled ? "On" : "Off")
                })}
                active={createComputed(() => state().bluetooth.enabled)}
                sensitive={createComputed(() => state().bluetooth.available)}
                onToggle={() => options.quickSettings.dispatch({ type: "toggle-bluetooth" })}
                onDetails={() => navigate("bluetooth")}
              />
            </Gtk.FlowBoxChild>
            <Gtk.FlowBoxChild visible={createComputed(() => state().powerMode.available)}>
              <SplitTile
                iconName={createComputed(() => state().powerMode.iconName)}
                label={createComputed(() => "Power Mode")}
                subtitle={createComputed(
                  () =>
                    state().powerMode.profiles.find(
                      (profile) => profile.id === state().powerMode.activeProfile,
                    )?.label ?? "Balanced",
                )}
                active={createComputed(
                  () =>
                    state().powerMode.activeProfile === "performance" ||
                    state().powerMode.activeProfile === "power-saver",
                )}
                sensitive={createComputed(() => state().powerMode.available)}
                onToggle={() => navigate("power-profile")}
                onDetails={() => navigate("power-profile")}
              />
            </Gtk.FlowBoxChild>
            <Gtk.FlowBoxChild visible={createComputed(() => state().nightLight.available)}>
              <MainTile
                iconName={createComputed(() => "weather-clear-symbolic")}
                label={createComputed(() => "Night Light")}
                active={createComputed(() => state().nightLight.enabled)}
                sensitive={createComputed(() => state().nightLight.available)}
                onClicked={() =>
                  options.quickSettings.dispatch({
                    type: "set-night-light",
                    enabled: !state().nightLight.enabled,
                  })
                }
              />
            </Gtk.FlowBoxChild>
            <Gtk.FlowBoxChild visible={createComputed(() => state().darkMode.available)}>
              <MainTile
                iconName={createComputed(() => "weather-clear-night-symbolic")}
                label={createComputed(() => "Dark Style")}
                active={createComputed(() => state().darkMode.enabled)}
                sensitive={createComputed(() => state().darkMode.available)}
                onClicked={() =>
                  options.quickSettings.dispatch({
                    type: "set-dark-mode",
                    enabled: !state().darkMode.enabled,
                  })
                }
              />
            </Gtk.FlowBoxChild>
            <Gtk.FlowBoxChild>
              <SplitTile
                iconName={createComputed(() => "view-dual-symbolic")}
                label={createComputed(() => "Orientation")}
                subtitle={createComputed(() =>
                  options.orientation === "vertical" ? "Vertical" : "Horizontal",
                )}
                active={createComputed(() => false)}
                onToggle={() =>
                  options.setBarOrientation(
                    options.orientation === "vertical" ? "horizontal" : "vertical",
                  )
                }
                onDetails={() => navigate("orientation")}
              />
            </Gtk.FlowBoxChild>
          </Gtk.FlowBox>

          <Gtk.Label
            class={quickSettingsError}
            label={createComputed(() => state().errorMessage ?? "")}
            xalign={0}
            wrap={true}
            visible={createComputed(() => state().errorMessage !== null)}
          />
        </Gtk.Box>

        <Gtk.Box
          class={quickSettingsDetails}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          visible={isPageVisible("wifi")}
        >
          <DetailHeader
            title="Wi-Fi"
            actionIconName="view-refresh-symbolic"
            actionTooltip="Scan networks"
            actionSensitive={createComputed(() => state().wifi.enabled)}
            onAction={() => options.quickSettings.dispatch({ type: "scan-wifi" })}
            onBack={() => navigate("main")}
          />
          <Gtk.Label
            class={quickSettingsEmptyState}
            label={createComputed(() =>
              state().wifi.enabled ? "No Wi-Fi networks found" : "Turn on Wi-Fi to view networks",
            )}
            wrap={true}
            justify={Gtk.Justification.CENTER}
            visible={createComputed(
              () => !state().wifi.enabled || state().wifi.networks.length === 0,
            )}
          />
          <Gtk.ScrolledWindow
            class={quickSettingsScroller}
            hscrollbarPolicy={Gtk.PolicyType.NEVER}
            vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            propagateNaturalHeight={true}
            maxContentHeight={336}
            visible={createComputed(() => state().wifi.enabled && state().wifi.networks.length > 0)}
          >
            <Gtk.ListBox class={quickSettingsList} selectionMode={Gtk.SelectionMode.NONE}>
              <For<QuickSettingsState["wifi"]["networks"][number], GObject.Object, string>
                each={createComputed(() => state().wifi.networks)}
                id={(network) => network.id}
              >
                {(network) => (
                  <DetailRow
                    iconName={network.iconName}
                    title={network.name}
                    statusIconName={network.secure ? "channel-secure-symbolic" : undefined}
                    active={createComputed(() => state().wifi.activeNetworkId === network.id)}
                    sensitive={createComputed(() => state().wifi.enabled)}
                    onClicked={() =>
                      options.quickSettings.dispatch({ type: "connect-wifi", id: network.id })
                    }
                  />
                )}
              </For>
            </Gtk.ListBox>
          </Gtk.ScrolledWindow>
        </Gtk.Box>

        <Gtk.Box
          class={quickSettingsDetails}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          visible={isPageVisible("bluetooth")}
        >
          <DetailHeader title="Bluetooth" onBack={() => navigate("main")} />
          <Gtk.Label
            class={quickSettingsEmptyState}
            label={createComputed(() =>
              state().bluetooth.enabled
                ? "No Bluetooth devices found"
                : "Turn on Bluetooth to connect to devices",
            )}
            wrap={true}
            justify={Gtk.Justification.CENTER}
            visible={createComputed(
              () => !state().bluetooth.enabled || state().bluetooth.devices.length === 0,
            )}
          />
          <Gtk.ListBox
            class={quickSettingsList}
            selectionMode={Gtk.SelectionMode.NONE}
            visible={createComputed(
              () => state().bluetooth.enabled && state().bluetooth.devices.length > 0,
            )}
          >
            <For<QuickSettingsState["bluetooth"]["devices"][number], GObject.Object, string>
              each={createComputed(() => state().bluetooth.devices)}
              id={(device) => device.id}
            >
              {(device) => (
                <DetailRow
                  iconName={device.iconName}
                  title={device.name}
                  subtitle={createComputed(() => {
                    const current = state().bluetooth.devices.find(
                      (candidate) => candidate.id === device.id,
                    )
                    if (!current) return "Unavailable"
                    if (current.connecting) return "Connecting…"
                    if (current.connected) return "Connected"
                    return current.batteryPercentage === null
                      ? "Not connected"
                      : `${current.batteryPercentage}% battery`
                  })}
                  active={createComputed(() =>
                    state().bluetooth.devices.some(
                      (candidate) => candidate.id === device.id && candidate.connected,
                    ),
                  )}
                  sensitive={createComputed(() => state().bluetooth.enabled)}
                  onClicked={() =>
                    options.quickSettings.dispatch({
                      type: "toggle-bluetooth-device",
                      id: device.id,
                    })
                  }
                />
              )}
            </For>
          </Gtk.ListBox>
        </Gtk.Box>

        <Gtk.Box
          class={quickSettingsDetails}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          visible={isPageVisible("audio")}
        >
          <DetailHeader title="Sound Output" onBack={() => navigate("main")} />
          <Gtk.ListBox class={quickSettingsList} selectionMode={Gtk.SelectionMode.NONE}>
            <For<QuickSettingsState["audio"]["outputs"][number], GObject.Object, string>
              each={createComputed(() => state().audio.outputs)}
              id={(output) => output.id}
            >
              {(output) => (
                <DetailRow
                  iconName={output.iconName}
                  title={output.name}
                  active={createComputed(() => state().audio.activeOutputId === output.id)}
                  onClicked={() =>
                    options.quickSettings.dispatch({ type: "select-audio-output", id: output.id })
                  }
                />
              )}
            </For>
          </Gtk.ListBox>
        </Gtk.Box>

        <Gtk.Box
          class={quickSettingsDetails}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          visible={isPageVisible("power-profile")}
        >
          <DetailHeader title="Power Mode" onBack={() => navigate("main")} />
          <Gtk.ListBox class={quickSettingsList} selectionMode={Gtk.SelectionMode.NONE}>
            <For<QuickSettingsState["powerMode"]["profiles"][number], GObject.Object, string>
              each={createComputed(() => state().powerMode.profiles)}
              id={(profile) => profile.id}
            >
              {(profile) => (
                <DetailRow
                  iconName={profile.iconName}
                  title={profile.label}
                  active={createComputed(() => state().powerMode.activeProfile === profile.id)}
                  onClicked={() =>
                    options.quickSettings.dispatch({ type: "set-power-profile", id: profile.id })
                  }
                />
              )}
            </For>
          </Gtk.ListBox>
        </Gtk.Box>

        <Gtk.Box
          class={quickSettingsDetails}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          visible={isPageVisible("orientation")}
        >
          <DetailHeader title="Bar Orientation" onBack={() => navigate("main")} />
          <Gtk.Box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} homogeneous={true}>
            <Gtk.ToggleButton
              class={quickSettingsChoice}
              label="Vertical"
              active={options.orientation === "vertical"}
              onToggled={(self) => {
                if (self.active) options.setBarOrientation("vertical")
              }}
            />
            <Gtk.ToggleButton
              class={quickSettingsChoice}
              label="Horizontal"
              active={options.orientation === "horizontal"}
              onToggled={(self) => {
                if (self.active) options.setBarOrientation("horizontal")
              }}
            />
          </Gtk.Box>
        </Gtk.Box>

        <Gtk.Box
          class={`${quickSettingsDetails} ${quickSettingsConfirmation}`}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          visible={isPageVisible("session-confirmation")}
        >
          <DetailHeader title="Power" onBack={() => navigate("main")} />
          <Gtk.Box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={12}
            visible={createComputed(() => sessionAction() !== null)}
          >
            <Gtk.Label
              label={createComputed(() => {
                const selected = sessionAction()
                return selected
                  ? `Are you sure you want to ${sessionLabel(selected).toLowerCase()}?`
                  : ""
              })}
              wrap={true}
              xalign={0}
            />
            <Gtk.Box spacing={8} homogeneous={true}>
              <Gtk.Button
                class={quickSettingsChoice}
                label="Cancel"
                onClicked={() => setSessionAction(null)}
              />
              <Gtk.Button
                class={quickSettingsChoice}
                label={createComputed(() => {
                  const selected = sessionAction()
                  return selected ? sessionLabel(selected) : "Confirm"
                })}
                onClicked={() => {
                  const selected = sessionAction.peek()
                  if (!selected) return
                  options.quickSettings.dispatch({ type: "session", action: selected })
                  navigate("main")
                  setSessionAction(null)
                }}
              />
            </Gtk.Box>
          </Gtk.Box>
          <Gtk.ListBox
            class={quickSettingsList}
            selectionMode={Gtk.SelectionMode.NONE}
            visible={createComputed(() => sessionAction() === null)}
          >
            <DetailRow
              iconName="media-playback-pause-symbolic"
              title="Suspend"
              visible={createComputed(() => state().session.suspend)}
              onClicked={() => setSessionAction("suspend")}
            />
            <DetailRow
              iconName="view-refresh-symbolic"
              title="Restart"
              visible={createComputed(() => state().session.reboot)}
              onClicked={() => setSessionAction("reboot")}
            />
            <DetailRow
              iconName="system-shutdown-symbolic"
              title="Power Off"
              visible={createComputed(() => state().session.powerOff)}
              onClicked={() => setSessionAction("power-off")}
            />
          </Gtk.ListBox>
        </Gtk.Box>
      </Gtk.Box>
    </Gtk.Popover>
  )
}
