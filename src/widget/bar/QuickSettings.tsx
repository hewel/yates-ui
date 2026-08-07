import GObject from "gi://GObject"
import Gtk from "gi://Gtk?version=4.0"
import Pango from "gi://Pango"

import {
  Accessor,
  For,
  createComputed,
  createEffect,
  createExternal,
  createState,
  onCleanup,
} from "gnim"

import {
  QuickSettingsModule,
  QuickSettingsState,
  SessionAction,
} from "../../services/quickSettingsModel"
import { BarOrientation } from "../../settings/appSettingsModel"
import {
  quickSettingsAction,
  quickSettingsActionGroup,
  quickSettingsBattery,
  quickSettingsBatteryValue,
  quickSettingsChoice,
  quickSettingsDetailRow,
  quickSettingsEmptyState,
  quickSettingsError,
  quickSettingsExpandedHeader,
  quickSettingsExpandedTitle,
  quickSettingsExpandedToggle,
  quickSettingsExtension,
  quickSettingsFooterButton,
  quickSettingsIcon,
  quickSettingsInlineDetail,
  quickSettingsList,
  quickSettingsMain,
  quickSettingsPanel,
  quickSettingsPopover,
  quickSettingsScroller,
  quickSettingsSection,
  quickSettingsSectionDimmed,
  quickSettingsSettingsPill,
  quickSettingsSlider,
  quickSettingsSplitTile,
  quickSettingsSplitTileArrow,
  quickSettingsSplitTilePrimary,
  quickSettingsSubtitle,
  quickSettingsTileIcon,
  quickSettingsTileLabel,
  quickSettingsTilePrimary,
  quickSettingsTilePlaceholder,
  quickSettingsTileRow,
  quickSettingsTileRows,
  quickSettingsTileText,
  quickSettingsTopRow,
} from "./QuickSettings.css"

export type QuickSettingsDetail =
  | "wifi"
  | "wired"
  | "vpn"
  | "mobile"
  | "bluetooth-tether"
  | "bluetooth"
  | "audio"
  | "power-profile"
  | "background-apps"
  | "orientation"
  | "session-confirmation"

/** @deprecated Kept for the test-control compatibility surface. */
export type QuickSettingsPage = "main" | QuickSettingsDetail

function isDetail(value: string): value is QuickSettingsDetail {
  switch (value) {
    case "wifi":
    case "wired":
    case "vpn":
    case "mobile":
    case "bluetooth-tether":
    case "bluetooth":
    case "audio":
    case "power-profile":
    case "background-apps":
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
    case "log-out":
      return "Log Out"
    case "switch-user":
      return "Switch User"
  }
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

function SettingsFooter({ label, onClicked }: { label: string; onClicked: () => void }) {
  return (
    <Gtk.Button class={`${quickSettingsSettingsPill} flat`} onClicked={onClicked}>
      <Gtk.Box spacing={8}>
        <Gtk.Label label={label} xalign={0} hexpand={true} />
        <Gtk.Image iconName="go-next-symbolic" pixelSize={14} />
      </Gtk.Box>
    </Gtk.Button>
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

interface QuickSettingsTileDescriptor {
  readonly id: string
  readonly detail: QuickSettingsDetail | null
  readonly visible: Accessor<boolean>
  readonly iconName: Accessor<string>
  readonly label: Accessor<string>
  readonly subtitle: Accessor<string> | null
  readonly active: Accessor<boolean>
  readonly sensitive: Accessor<boolean>
  readonly onToggle: () => void
  readonly renderDetail: (() => GObject.Object) | null
}

function ExpandedDetailHeader({
  tile,
  openSettings,
  onCollapse,
}: {
  tile: QuickSettingsTileDescriptor
  openSettings: () => void
  onCollapse: () => void
}) {
  const settingsLabel = (() => {
    switch (tile.detail) {
      case "wifi":
        return "Wi-Fi Settings"
      case "bluetooth":
      case "bluetooth-tether":
        return "Bluetooth Settings"
      case "power-profile":
        return "Power Settings"
      default:
        return "Network Settings"
    }
  })()
  return (
    <Gtk.Box class={quickSettingsExpandedHeader} spacing={10}>
      <Gtk.ToggleButton
        class={`${quickSettingsExpandedToggle} flat`}
        active={tile.active}
        sensitive={tile.sensitive}
        tooltipText={tile.label}
        onToggled={(self) => {
          if (self.active !== tile.active()) tile.onToggle()
        }}
        $={(self: Gtk.ToggleButton) => {
          self.update_property([Gtk.AccessibleProperty.LABEL], [`Toggle ${tile.label()}`])
        }}
      >
        <Gtk.Image iconName={tile.iconName} pixelSize={20} />
      </Gtk.ToggleButton>
      <Gtk.Label
        class={quickSettingsExpandedTitle}
        label={tile.label}
        xalign={0}
        hexpand={true}
        ellipsize={Pango.EllipsizeMode.END}
      />
      <Gtk.Button
        class={`${quickSettingsSettingsPill} flat`}
        label={settingsLabel}
        onClicked={openSettings}
      />
      <Gtk.Button
        class={`${quickSettingsAction} flat`}
        iconName="go-up-symbolic"
        tooltipText="Close submenu"
        onClicked={onCollapse}
        $={(self: Gtk.Button) => {
          self.update_property([Gtk.AccessibleProperty.LABEL], ["Close submenu"])
        }}
      />
    </Gtk.Box>
  )
}

function renderTile(
  tile: QuickSettingsTileDescriptor,
  detail: Accessor<QuickSettingsDetail | null>,
  openDetail: (detail: string | null) => boolean,
): GObject.Object {
  const dimmed = createComputed(() => detail() !== null && detail() !== tile.detail)
  const className = dimmed.as((isDimmed) =>
    isDimmed ? `${quickSettingsSection} ${quickSettingsSectionDimmed}` : quickSettingsSection,
  )
  const toggle = () => {
    if (detail.peek() !== null && detail.peek() !== tile.detail) openDetail(null)
    tile.onToggle()
  }

  return (
    <Gtk.Box class={className} hexpand={true}>
      {tile.detail === null ? (
        <MainTile
          iconName={tile.iconName}
          label={tile.label}
          active={tile.active}
          sensitive={tile.sensitive}
          onClicked={toggle}
        />
      ) : (
        <SplitTile
          iconName={tile.iconName}
          label={tile.label}
          subtitle={tile.subtitle ?? createComputed(() => "")}
          active={tile.active}
          sensitive={tile.sensitive}
          onToggle={toggle}
          onDetails={() => openDetail(detail.peek() === tile.detail ? null : tile.detail)}
        />
      )}
    </Gtk.Box>
  )
}

function TileRows({
  tiles,
  detail,
  openDetail,
  openSettings,
}: {
  tiles: ReadonlyArray<QuickSettingsTileDescriptor>
  detail: Accessor<QuickSettingsDetail | null>
  openDetail: (detail: string | null) => boolean
  openSettings: () => void
}) {
  const rows = createComputed(() => {
    const visible = tiles.filter((tile) => tile.visible())
    const result: Array<ReadonlyArray<QuickSettingsTileDescriptor>> = []
    for (let index = 0; index < visible.length; index += 2) {
      result.push(visible.slice(index, index + 2))
    }
    return result
  })

  const closePlaceholder = () => (
    <Gtk.Button
      class={`${quickSettingsTilePlaceholder} flat`}
      hexpand={true}
      canFocus={false}
      sensitive={createComputed(() => detail() !== null)}
      tooltipText="Close submenu"
      onClicked={() => openDetail(null)}
      $={(self: Gtk.Button) => {
        self.update_property([Gtk.AccessibleProperty.LABEL], ["Close submenu"])
      }}
    />
  )

  return (
    <Gtk.Box class={quickSettingsTileRows} orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <For<ReadonlyArray<QuickSettingsTileDescriptor>, GObject.Object, string>
        each={rows}
        id={(row) => row.map((tile) => tile.id).join(":")}
      >
        {(row) => {
          const first = row[0]
          const second = row[1] ?? null
          const rowExpanded = createComputed(
            () =>
              detail() !== null &&
              (detail() === first.detail || (second !== null && detail() === second.detail)),
          )
          const renderExpanded = (
            tile: QuickSettingsTileDescriptor | null,
            selectedIndex: number,
          ): GObject.Object => {
            if (!tile?.detail || !tile.renderDetail) return <Gtk.Box visible={false} />
            const selected = createComputed(() => detail() === tile.detail)
            return (
              <Gtk.Revealer
                visible={selected}
                revealChild={true}
                transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
                transitionDuration={200}
              >
                <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                  <Gtk.Box
                    class={quickSettingsInlineDetail}
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                  >
                    <ExpandedDetailHeader
                      tile={tile}
                      openSettings={openSettings}
                      onCollapse={() => openDetail(null)}
                    />
                    {tile.renderDetail()}
                  </Gtk.Box>
                  {second && (
                    <Gtk.Box class={quickSettingsTileRow} spacing={12} homogeneous={true}>
                      {selectedIndex === 0
                        ? closePlaceholder()
                        : renderTile(first, detail, openDetail)}
                      {selectedIndex === 0
                        ? renderTile(second, detail, openDetail)
                        : closePlaceholder()}
                    </Gtk.Box>
                  )}
                </Gtk.Box>
              </Gtk.Revealer>
            )
          }
          return (
            <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
              <Gtk.Box
                class={quickSettingsTileRow}
                spacing={12}
                homogeneous={true}
                visible={rowExpanded.as((expanded) => !expanded)}
              >
                {renderTile(first, detail, openDetail)}
                {second ? renderTile(second, detail, openDetail) : closePlaceholder()}
              </Gtk.Box>
              {renderExpanded(first, 0)}
              {renderExpanded(second, 1)}
            </Gtk.Box>
          )
        }}
      </For>
    </Gtk.Box>
  )
}

export interface QuickSettingsHandle {
  show(): void
  hide(): void
  visible(): boolean
  detail(): QuickSettingsDetail | null
  openDetail(detail: string | null): boolean
  /** @deprecated Use detail(). */
  page(): QuickSettingsPage
  /** @deprecated Use openDetail(). */
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
  let syncingVolume = false
  let syncingBrightness = false
  const state = createExternal<QuickSettingsState>(options.quickSettings.snapshot(), (set) =>
    options.quickSettings.subscribe(set),
  )
  const [detail, setDetail] = createState<QuickSettingsDetail | null>(null)
  const [sessionAction, setSessionAction] = createState<SessionAction | null>(null)
  const [bluetoothOrder, setBluetoothOrder] = createState<ReadonlyArray<string>>([])
  createEffect(() => {
    if (detail() !== "bluetooth") {
      if (bluetoothOrder().length > 0) setBluetoothOrder([])
      return
    }
    const availableIds = state().bluetooth.devices.map((device) => device.id)
    const previous = bluetoothOrder()
    const next = [
      ...previous.filter((id) => availableIds.includes(id)),
      ...availableIds.filter((id) => !previous.includes(id)),
    ]
    if (next.length !== previous.length || next.some((id, index) => id !== previous[index])) {
      setBluetoothOrder(next)
    }
  })
  const isDetailVisible = (name: QuickSettingsDetail) => createComputed(() => detail() === name)
  const openDetail = (target: string | null): boolean => {
    if (target === null || target === "main") {
      setDetail(null)
      setSessionAction(null)
      return true
    }
    if (!isDetail(target)) return false
    setDetail(target)
    if (target !== "session-confirmation") setSessionAction(null)
    return true
  }
  const closeAndReset = (popover: Gtk.Popover) => {
    popover.popdown()
    setDetail(null)
    setSessionAction(null)
  }
  const openSettings = () => {
    if (popover) closeAndReset(popover)
    options.openSettings()
  }

  const renderWifiDetail = (): GObject.Object => (
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <Gtk.Label
        class={quickSettingsEmptyState}
        label={createComputed(() =>
          state().wifi.enabled ? "No Wi-Fi networks found" : "Turn on Wi-Fi to view networks",
        )}
        wrap={true}
        justify={Gtk.Justification.CENTER}
        visible={createComputed(() => !state().wifi.enabled || state().wifi.networks.length === 0)}
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
            each={createComputed(() => state().wifi.networks.slice(0, 8))}
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
      <SettingsFooter label="All Networks" onClicked={openSettings} />
    </Gtk.Box>
  )

  type ConnectionDetail = "wired" | "vpn" | "mobile" | "bluetooth-tether"
  const connectionState = (kind: ConnectionDetail) => {
    switch (kind) {
      case "wired":
        return state().wired
      case "vpn":
        return state().vpn
      case "mobile":
        return state().mobile
      case "bluetooth-tether":
        return state().bluetoothTether
    }
  }
  const renderConnectionDetail = (kind: ConnectionDetail): GObject.Object => {
    const connections = createComputed(() => connectionState(kind).connections.slice(0, 8))
    const settingsLabel = kind === "bluetooth-tether" ? "Bluetooth Settings" : "Network Settings"
    const dispatchConnection = (id: string) => {
      switch (kind) {
        case "wired":
          options.quickSettings.dispatch({ type: "toggle-wired-connection", id })
          break
        case "vpn":
          options.quickSettings.dispatch({ type: "toggle-vpn", id })
          break
        case "mobile":
          options.quickSettings.dispatch({ type: "toggle-mobile-connection", id })
          break
        case "bluetooth-tether":
          options.quickSettings.dispatch({ type: "toggle-bluetooth-tether", id })
          break
      }
    }
    return (
      <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <Gtk.Label
          class={quickSettingsEmptyState}
          label="Networks will show here when used"
          wrap={true}
          justify={Gtk.Justification.CENTER}
          visible={connections.as((items) => items.length === 0)}
        />
        <Gtk.ScrolledWindow
          class={quickSettingsScroller}
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          propagateNaturalHeight={true}
          maxContentHeight={336}
          visible={connections.as((items) => items.length > 0)}
        >
          <Gtk.ListBox class={quickSettingsList} selectionMode={Gtk.SelectionMode.NONE}>
            <For<QuickSettingsState["vpn"]["connections"][number], GObject.Object, string>
              each={connections}
              id={(connection) => connection.id}
            >
              {(connection) => (
                <DetailRow
                  iconName={connection.iconName}
                  title={connection.name}
                  subtitle={connection.connected ? "Connected" : (connection.subtitle ?? undefined)}
                  active={createComputed(() =>
                    connectionState(kind).connections.some(
                      (candidate) => candidate.id === connection.id && candidate.connected,
                    ),
                  )}
                  onClicked={() => dispatchConnection(connection.id)}
                />
              )}
            </For>
          </Gtk.ListBox>
        </Gtk.ScrolledWindow>
        <SettingsFooter label={settingsLabel} onClicked={openSettings} />
      </Gtk.Box>
    )
  }

  const renderBluetoothDetail = (): GObject.Object => (
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <Gtk.Label
        class={quickSettingsEmptyState}
        label={createComputed(() =>
          state().bluetooth.enabled
            ? "No available or connected devices"
            : "Turn on Bluetooth to connect to devices",
        )}
        wrap={true}
        justify={Gtk.Justification.CENTER}
        visible={createComputed(
          () => !state().bluetooth.enabled || state().bluetooth.devices.length === 0,
        )}
      />
      <Gtk.ScrolledWindow
        class={quickSettingsScroller}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        propagateNaturalHeight={true}
        maxContentHeight={336}
        visible={createComputed(
          () => state().bluetooth.enabled && state().bluetooth.devices.length > 0,
        )}
      >
        <Gtk.ListBox class={quickSettingsList} selectionMode={Gtk.SelectionMode.NONE}>
          <For<QuickSettingsState["bluetooth"]["devices"][number], GObject.Object, string>
            each={createComputed(() => {
              const devices = state().bluetooth.devices
              const order = bluetoothOrder()
              if (order.length === 0) return devices
              const byId = new Map(devices.map((device) => [device.id, device]))
              return order.flatMap((id) => {
                const device = byId.get(id)
                return device ? [device] : []
              })
            })}
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
                  return current.connected ? "Disconnect" : "Connect"
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
      </Gtk.ScrolledWindow>
      <SettingsFooter label="Bluetooth Settings" onClicked={openSettings} />
    </Gtk.Box>
  )

  const renderPowerDetail = (): GObject.Object => (
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
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
      <SettingsFooter label="Power Settings" onClicked={openSettings} />
    </Gtk.Box>
  )

  const tiles: ReadonlyArray<QuickSettingsTileDescriptor> = [
    {
      id: "wired",
      detail: "wired",
      visible: createComputed(() => state().wired.available),
      iconName: createComputed(() => state().wired.iconName),
      label: createComputed(() => "Wired"),
      subtitle: createComputed(() => (state().wired.enabled ? "Connected" : "Off")),
      active: createComputed(() => state().wired.enabled),
      sensitive: createComputed(() => state().wired.available),
      onToggle: () => {
        const connection = state.peek().wired.connections[0]
        if (connection)
          options.quickSettings.dispatch({ type: "toggle-wired-connection", id: connection.id })
      },
      renderDetail: () => renderConnectionDetail("wired"),
    },
    {
      id: "wifi",
      detail: "wifi",
      visible: createComputed(() => state().wifi.available),
      iconName: createComputed(() => state().wifi.iconName),
      label: createComputed(() => "Wi-Fi"),
      subtitle: createComputed(
        () => state().wifi.activeNetworkName ?? (state().wifi.enabled ? "Not connected" : "Off"),
      ),
      active: createComputed(() => state().wifi.enabled),
      sensitive: createComputed(() => state().wifi.available),
      onToggle: () => options.quickSettings.dispatch({ type: "toggle-wifi" }),
      renderDetail: renderWifiDetail,
    },
    ...(["mobile", "bluetooth-tether", "vpn"] as const).map((kind) => ({
      id: kind,
      detail: kind,
      visible: createComputed(() => connectionState(kind).available),
      iconName: createComputed(() => connectionState(kind).iconName),
      label: createComputed(() => {
        if (kind === "mobile") return "Mobile Connections"
        if (kind === "bluetooth-tether") return "Bluetooth Tethers"
        return "VPN"
      }),
      subtitle: createComputed(() => {
        const current = connectionState(kind)
        const active = current.connections.find((connection) => connection.connected)
        return active?.name ?? (current.enabled ? "On" : "Off")
      }),
      active: createComputed(() => connectionState(kind).enabled),
      sensitive: createComputed(() => connectionState(kind).available),
      onToggle: () => {
        const connection = connectionState(kind).connections[0]
        if (!connection) return
        const type =
          kind === "mobile"
            ? "toggle-mobile-connection"
            : kind === "bluetooth-tether"
              ? "toggle-bluetooth-tether"
              : "toggle-vpn"
        options.quickSettings.dispatch({ type, id: connection.id })
      },
      renderDetail: () => renderConnectionDetail(kind),
    })),
    {
      id: "bluetooth",
      detail: "bluetooth",
      visible: createComputed(() => state().bluetooth.available),
      iconName: createComputed(() =>
        state().bluetooth.enabled ? "bluetooth-active-symbolic" : "bluetooth-disabled-symbolic",
      ),
      label: createComputed(() => "Bluetooth"),
      subtitle: createComputed(() => {
        const connected = state().bluetooth.devices.filter((device) => device.connected)
        if (connected.length === 1) return connected[0]?.name ?? "Connected"
        if (connected.length > 1) return `${connected.length} Connected`
        return state().bluetooth.enabled ? "On" : "Off"
      }),
      active: createComputed(() => state().bluetooth.enabled),
      sensitive: createComputed(() => state().bluetooth.available),
      onToggle: () => options.quickSettings.dispatch({ type: "toggle-bluetooth" }),
      renderDetail: renderBluetoothDetail,
    },
    {
      id: "power-profile",
      detail: "power-profile",
      visible: createComputed(() => state().powerMode.available),
      iconName: createComputed(() => state().powerMode.iconName),
      label: createComputed(() => "Power Mode"),
      subtitle: createComputed(
        () =>
          state().powerMode.profiles.find(
            (profile) => profile.id === state().powerMode.activeProfile,
          )?.label ?? "Balanced",
      ),
      active: createComputed(
        () =>
          state().powerMode.activeProfile === "performance" ||
          state().powerMode.activeProfile === "power-saver",
      ),
      sensitive: createComputed(() => state().powerMode.available),
      onToggle: () => {
        const current = state.peek().powerMode
        const next = current.activeProfile === "power-saver" ? "balanced" : "power-saver"
        if (current.profiles.some((profile) => profile.id === next)) {
          options.quickSettings.dispatch({ type: "set-power-profile", id: next })
        }
      },
      renderDetail: renderPowerDetail,
    },
    {
      id: "night-light",
      detail: null,
      visible: createComputed(() => state().nightLight.available),
      iconName: createComputed(() => "weather-clear-symbolic"),
      label: createComputed(() => "Night Light"),
      subtitle: null,
      active: createComputed(() => state().nightLight.enabled),
      sensitive: createComputed(() => state().nightLight.available),
      onToggle: () =>
        options.quickSettings.dispatch({
          type: "set-night-light",
          enabled: !state.peek().nightLight.enabled,
        }),
      renderDetail: null,
    },
    {
      id: "dark-style",
      detail: null,
      visible: createComputed(() => state().darkMode.available),
      iconName: createComputed(() => "weather-clear-night-symbolic"),
      label: createComputed(() => "Dark Style"),
      subtitle: null,
      active: createComputed(() => state().darkMode.enabled),
      sensitive: createComputed(() => state().darkMode.available),
      onToggle: () =>
        options.quickSettings.dispatch({
          type: "set-dark-mode",
          enabled: !state.peek().darkMode.enabled,
        }),
      renderDetail: null,
    },
    {
      id: "airplane-mode",
      detail: null,
      visible: createComputed(() => state().airplaneMode.available),
      iconName: createComputed(() => "airplane-mode-symbolic"),
      label: createComputed(() => "Airplane Mode"),
      subtitle: null,
      active: createComputed(() => state().airplaneMode.enabled),
      sensitive: createComputed(() => state().airplaneMode.available),
      onToggle: () =>
        options.quickSettings.dispatch({
          type: "set-airplane-mode",
          enabled: !state.peek().airplaneMode.enabled,
        }),
      renderDetail: null,
    },
    {
      id: "auto-rotate",
      detail: null,
      visible: createComputed(() => state().autoRotate.available),
      iconName: createComputed(() => "object-rotate-right-symbolic"),
      label: createComputed(() => "Auto Rotate"),
      subtitle: null,
      active: createComputed(() => state().autoRotate.enabled),
      sensitive: createComputed(() => state().autoRotate.available),
      onToggle: () =>
        options.quickSettings.dispatch({
          type: "set-auto-rotate",
          enabled: !state.peek().autoRotate.enabled,
        }),
      renderDetail: null,
    },
  ]

  createEffect(() => {
    const current = detail()
    if (current === null || current === "orientation" || current === "session-confirmation") return
    if (current === "audio") {
      if (!state().audio.available || state().audio.outputs.length < 2) openDetail(null)
      return
    }
    if (current === "background-apps") {
      if (!state().backgroundApps.available || state().backgroundApps.apps.length === 0) {
        openDetail(null)
      }
      return
    }
    const tile = tiles.find((candidate) => candidate.detail === current)
    if (!tile?.visible()) openDetail(null)
  })

  return (
    <Gtk.Popover
      class={quickSettingsPopover}
      autohide={true}
      hasArrow={false}
      onClosed={() => {
        setDetail(null)
        setSessionAction(null)
      }}
      $={(self: Gtk.Popover) => {
        popover = self
        options.onReady({
          show: () => {
            const owner = self.get_parent()
            if (owner instanceof Gtk.MenuButton) owner.set_active(true)
            else self.popup()
          },
          hide: () => {
            const owner = self.get_parent()
            if (owner instanceof Gtk.MenuButton) owner.set_active(false)
            else self.popdown()
          },
          visible: () => self.visible,
          detail: () => detail.peek(),
          openDetail,
          page: () => detail.peek() ?? "main",
          navigate: (page) => openDetail(page),
        })
      }}
    >
      <Gtk.Box class={quickSettingsPanel} orientation={Gtk.Orientation.VERTICAL}>
        <Gtk.Box class={quickSettingsMain} orientation={Gtk.Orientation.VERTICAL} spacing={14}>
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
                    state().session.suspend ||
                    state().session.reboot ||
                    state().session.powerOff ||
                    state().session.logOut ||
                    state().session.switchUser,
                )}
                onClicked={() =>
                  openDetail(
                    detail.peek() === "session-confirmation" ? null : "session-confirmation",
                  )
                }
                $={(self: Gtk.Button) =>
                  self.update_property([Gtk.AccessibleProperty.LABEL], ["Power options"])
                }
              />
            </Gtk.Box>
          </Gtk.Box>

          <Gtk.Revealer
            revealChild={isDetailVisible("session-confirmation")}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={200}
          >
            <Gtk.Box
              class={quickSettingsInlineDetail}
              orientation={Gtk.Orientation.VERTICAL}
              spacing={10}
            >
              <Gtk.Label class={quickSettingsExpandedTitle} label="Power Off" xalign={0} />
              <Gtk.Box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={10}
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
                      openDetail(null)
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
                  title="Restart…"
                  visible={createComputed(() => state().session.reboot)}
                  onClicked={() => setSessionAction("reboot")}
                />
                <DetailRow
                  iconName="system-shutdown-symbolic"
                  title="Power Off…"
                  visible={createComputed(() => state().session.powerOff)}
                  onClicked={() => setSessionAction("power-off")}
                />
                <DetailRow
                  iconName="system-log-out-symbolic"
                  title="Log Out…"
                  visible={createComputed(() => state().session.logOut)}
                  onClicked={() => setSessionAction("log-out")}
                />
                <DetailRow
                  iconName="system-switch-user-symbolic"
                  title="Switch User…"
                  visible={createComputed(() => state().session.switchUser)}
                  onClicked={() => setSessionAction("switch-user")}
                />
              </Gtk.ListBox>
            </Gtk.Box>
          </Gtk.Revealer>

          <Gtk.Box spacing={10} visible={createComputed(() => state().audio.available)}>
            <Gtk.Image iconName={createComputed(() => state().audio.iconName)} pixelSize={20} />
            <Gtk.Scale
              class={quickSettingsSlider}
              orientation={Gtk.Orientation.HORIZONTAL}
              hexpand={true}
              drawValue={false}
              tooltipText={createComputed(() => `Volume ${percentage(state().audio.volume)}`)}
              onValueChanged={(self) => {
                if (syncingVolume) return
                options.quickSettings.dispatch({ type: "set-volume", value: self.get_value() })
              }}
              $={(self: Gtk.Scale) => {
                self.set_range(0, 1)
                self.set_increments(0.01, 0.1)
                syncingVolume = true
                self.set_value(state().audio.volume)
                syncingVolume = false
                onCleanup(
                  state.subscribe(() => {
                    syncingVolume = true
                    self.set_value(state().audio.volume)
                    syncingVolume = false
                  }),
                )
              }}
            />
            <Gtk.Button
              class={`${quickSettingsFooterButton} flat`}
              iconName="go-next-symbolic"
              tooltipText="Sound output"
              visible={createComputed(() => state().audio.outputs.length > 1)}
              onClicked={() => openDetail(detail.peek() === "audio" ? null : "audio")}
              $={(self: Gtk.Button) =>
                self.update_property([Gtk.AccessibleProperty.LABEL], ["Sound output"])
              }
            />
          </Gtk.Box>

          <Gtk.Revealer
            revealChild={isDetailVisible("audio")}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={200}
          >
            <Gtk.Box
              class={quickSettingsInlineDetail}
              orientation={Gtk.Orientation.VERTICAL}
              spacing={8}
            >
              <Gtk.Label class={quickSettingsExpandedTitle} label="Sound Output" xalign={0} />
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
                        options.quickSettings.dispatch({
                          type: "select-audio-output",
                          id: output.id,
                        })
                      }
                    />
                  )}
                </For>
              </Gtk.ListBox>
              <SettingsFooter label="Sound Settings" onClicked={openSettings} />
            </Gtk.Box>
          </Gtk.Revealer>

          <Gtk.Box spacing={10} visible={createComputed(() => state().brightness.available)}>
            <Gtk.Image
              iconName={createComputed(() => state().brightness.iconName)}
              pixelSize={20}
            />
            <Gtk.Scale
              class={quickSettingsSlider}
              orientation={Gtk.Orientation.HORIZONTAL}
              hexpand={true}
              drawValue={false}
              tooltipText={createComputed(
                () => `Brightness ${percentage(state().brightness.value)}`,
              )}
              onValueChanged={(self) => {
                if (syncingBrightness) return
                options.quickSettings.dispatch({
                  type: "set-brightness",
                  value: self.get_value(),
                })
              }}
              $={(self: Gtk.Scale) => {
                self.set_range(0, 1)
                self.set_increments(0.01, 0.1)
                syncingBrightness = true
                self.set_value(state().brightness.value)
                syncingBrightness = false
                onCleanup(
                  state.subscribe(() => {
                    syncingBrightness = true
                    self.set_value(state().brightness.value)
                    syncingBrightness = false
                  }),
                )
              }}
            />
          </Gtk.Box>

          <TileRows
            tiles={tiles}
            detail={detail}
            openDetail={openDetail}
            openSettings={openSettings}
          />

          <Gtk.Button
            class={`${quickSettingsExtension} flat`}
            visible={createComputed(
              () => state().backgroundApps.available && state().backgroundApps.apps.length > 0,
            )}
            onClicked={() =>
              openDetail(detail.peek() === "background-apps" ? null : "background-apps")
            }
          >
            <Gtk.Box spacing={10}>
              <Gtk.Image iconName="application-x-executable-symbolic" pixelSize={18} />
              <Gtk.Label
                label={createComputed(
                  () => `${state().backgroundApps.apps.length} Background Apps`,
                )}
                xalign={0}
                hexpand={true}
              />
              <Gtk.Image iconName="go-next-symbolic" pixelSize={14} />
            </Gtk.Box>
          </Gtk.Button>

          <Gtk.Revealer
            revealChild={isDetailVisible("background-apps")}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={200}
          >
            <Gtk.Box
              class={quickSettingsInlineDetail}
              orientation={Gtk.Orientation.VERTICAL}
              spacing={8}
            >
              <Gtk.Label class={quickSettingsExpandedTitle} label="Background Apps" xalign={0} />
              <Gtk.ListBox class={quickSettingsList} selectionMode={Gtk.SelectionMode.NONE}>
                <For<QuickSettingsState["backgroundApps"]["apps"][number], GObject.Object, string>
                  each={createComputed(() => state().backgroundApps.apps)}
                  id={(app) => app.id}
                >
                  {(app) => (
                    <DetailRow
                      iconName={app.iconName}
                      title={app.name}
                      subtitle={app.status ?? undefined}
                      onClicked={() =>
                        options.quickSettings.dispatch({ type: "stop-background-app", id: app.id })
                      }
                    />
                  )}
                </For>
              </Gtk.ListBox>
              <SettingsFooter label="App Settings" onClicked={openSettings} />
            </Gtk.Box>
          </Gtk.Revealer>

          <Gtk.Box
            class={quickSettingsExtension}
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
          >
            <SplitTile
              iconName={createComputed(() => "view-dual-symbolic")}
              label={createComputed(() => "Bar Orientation")}
              subtitle={createComputed(() =>
                options.orientation === "vertical" ? "Vertical" : "Horizontal",
              )}
              active={createComputed(() => false)}
              onToggle={() =>
                options.setBarOrientation(
                  options.orientation === "vertical" ? "horizontal" : "vertical",
                )
              }
              onDetails={() => openDetail(detail.peek() === "orientation" ? null : "orientation")}
            />
            <Gtk.Revealer
              revealChild={isDetailVisible("orientation")}
              transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
              transitionDuration={200}
            >
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
            </Gtk.Revealer>
          </Gtk.Box>

          <Gtk.Label
            class={quickSettingsError}
            label={createComputed(() => state().error?.message ?? "")}
            xalign={0}
            wrap={true}
            visible={createComputed(() => state().error !== null)}
          />
        </Gtk.Box>
      </Gtk.Box>
    </Gtk.Popover>
  )
}
