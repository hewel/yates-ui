export interface BatteryPresentation {
  readonly available: boolean
  readonly percentage: number
  readonly iconName: string
  readonly charging: boolean
}

export interface BrightnessPresentation {
  readonly available: boolean
  readonly value: number
  readonly iconName: string
}

export interface AudioOutputPresentation {
  readonly id: string
  readonly name: string
  readonly iconName: string
}

export interface AudioPresentation {
  readonly available: boolean
  readonly volume: number
  readonly muted: boolean
  readonly iconName: string
  readonly activeOutputId: string | null
  readonly outputs: ReadonlyArray<AudioOutputPresentation>
}

/**
 * AstalWp's `connected` GObject property is broken in current releases and emits
 * a warning whenever it is read. A real output is the capability the UI needs.
 */
export function audioAvailableFromOutputs(
  activeOutputId: string | null,
  outputs: ReadonlyArray<AudioOutputPresentation>,
): boolean {
  return activeOutputId !== null && outputs.some((output) => output.id === activeOutputId)
}

export interface WifiNetworkPresentation {
  readonly id: string
  readonly name: string
  readonly iconName: string
  readonly secure: boolean
  readonly known: boolean
  readonly strength: number
}

export interface WifiPresentation {
  readonly available: boolean
  readonly enabled: boolean
  readonly activeNetworkId: string | null
  readonly activeNetworkName: string | null
  readonly iconName: string
  readonly scanning: boolean
  readonly networks: ReadonlyArray<WifiNetworkPresentation>
}

export interface ConnectionPresentation {
  readonly id: string
  readonly name: string
  readonly iconName: string
  readonly connected: boolean
  readonly subtitle: string | null
}

export interface WiredPresentation {
  readonly available: boolean
  readonly enabled: boolean
  readonly activeConnectionId: string | null
  readonly iconName: string
  readonly connections: ReadonlyArray<ConnectionPresentation>
}

export interface RadioConnectionsPresentation {
  readonly available: boolean
  readonly enabled: boolean
  readonly activeConnectionIds: ReadonlyArray<string>
  readonly iconName: string
  readonly connections: ReadonlyArray<ConnectionPresentation>
}

export interface BluetoothDevicePresentation {
  readonly id: string
  readonly name: string
  readonly iconName: string
  readonly connected: boolean
  readonly paired: boolean
  readonly connecting: boolean
  readonly batteryPercentage: number | null
}

export interface BluetoothPresentation {
  readonly available: boolean
  readonly enabled: boolean
  readonly devices: ReadonlyArray<BluetoothDevicePresentation>
}

export interface PowerProfilePresentation {
  readonly id: string
  readonly label: string
  readonly iconName: string
}

export interface PowerModePresentation {
  readonly available: boolean
  readonly activeProfile: string
  readonly iconName: string
  readonly profiles: ReadonlyArray<PowerProfilePresentation>
}

export interface TogglePresentation {
  readonly available: boolean
  readonly enabled: boolean
}

export interface BackgroundAppPresentation {
  readonly id: string
  readonly name: string
  readonly iconName: string
  readonly status: string | null
}

export interface BackgroundAppsPresentation {
  readonly available: boolean
  readonly apps: ReadonlyArray<BackgroundAppPresentation>
}

export interface CastPresentation {
  readonly id: string
  readonly name: string
  readonly source: string | null
  readonly controllable: boolean
}

export interface ScreenRecordingPresentation {
  readonly active: boolean
  readonly elapsedSeconds: number
}

export interface PrivacyPresentation {
  readonly microphone: boolean
  readonly camera: boolean
  readonly location: boolean
  readonly screenRecording: ScreenRecordingPresentation
  readonly casts: ReadonlyArray<CastPresentation>
}

export interface SessionPresentation {
  readonly screenshot: boolean
  readonly lock: boolean
  readonly suspend: boolean
  readonly reboot: boolean
  readonly powerOff: boolean
  readonly logOut: boolean
  readonly switchUser: boolean
  readonly locked: boolean
}

export interface QuickSettingsPending {
  readonly kind: QuickSettingsAction["type"]
  readonly targetId: string | null
}

export interface QuickSettingsError extends QuickSettingsPending {
  readonly message: string
}

export interface QuickSettingsState {
  readonly battery: BatteryPresentation
  readonly brightness: BrightnessPresentation
  readonly audio: AudioPresentation
  readonly wifi: WifiPresentation
  readonly wired: WiredPresentation
  readonly vpn: RadioConnectionsPresentation
  readonly mobile: RadioConnectionsPresentation
  readonly bluetoothTether: RadioConnectionsPresentation
  readonly bluetooth: BluetoothPresentation
  readonly powerMode: PowerModePresentation
  readonly darkMode: TogglePresentation
  readonly nightLight: TogglePresentation
  readonly airplaneMode: TogglePresentation
  readonly autoRotate: TogglePresentation
  readonly backgroundApps: BackgroundAppsPresentation
  readonly privacy: PrivacyPresentation
  readonly session: SessionPresentation
  readonly pending: QuickSettingsPending | null
  readonly error: QuickSettingsError | null
}

export type SessionAction = "suspend" | "reboot" | "power-off" | "log-out" | "switch-user"

export type QuickSettingsAction =
  | { readonly type: "set-volume"; readonly value: number }
  | { readonly type: "toggle-mute" }
  | { readonly type: "set-brightness"; readonly value: number }
  | { readonly type: "select-audio-output"; readonly id: string }
  | { readonly type: "toggle-wifi" }
  | { readonly type: "scan-wifi" }
  | { readonly type: "connect-wifi"; readonly id: string }
  | { readonly type: "toggle-wired-connection"; readonly id: string }
  | { readonly type: "toggle-vpn"; readonly id: string }
  | { readonly type: "toggle-mobile-connection"; readonly id: string }
  | { readonly type: "toggle-bluetooth-tether"; readonly id: string }
  | { readonly type: "toggle-bluetooth" }
  | { readonly type: "toggle-bluetooth-device"; readonly id: string }
  | { readonly type: "set-power-profile"; readonly id: string }
  | { readonly type: "set-dark-mode"; readonly enabled: boolean }
  | { readonly type: "set-night-light"; readonly enabled: boolean }
  | { readonly type: "set-airplane-mode"; readonly enabled: boolean }
  | { readonly type: "set-auto-rotate"; readonly enabled: boolean }
  | { readonly type: "stop-background-app"; readonly id: string }
  | { readonly type: "stop-screen-recording" }
  | { readonly type: "stop-cast"; readonly id: string }
  | { readonly type: "take-screenshot" }
  | { readonly type: "lock" }
  | { readonly type: "session"; readonly action: SessionAction }
  | { readonly type: "clear-error" }

export type QuickSettingsFixtureProfile =
  | "laptop"
  | "desktop"
  | "complex"
  | "lockscreen-laptop"
  | "lockscreen-desktop"
  | "empty-states"

const fixtureAudioOutputs: ReadonlyArray<AudioOutputPresentation> = [
  { id: "built-in", name: "Built-in Audio", iconName: "audio-speakers-symbolic" },
  { id: "headphones", name: "Headphones", iconName: "audio-headphones-symbolic" },
]

const fixtureWifiNetworks: ReadonlyArray<WifiNetworkPresentation> = [
  ["office", "Office", "excellent", true, true, 94],
  ["o2-335680", "O2-335680", "excellent", true, true, 89],
  ["fbi-surveillance-van", "FBI Surveillance Van", "good", true, false, 81],
  ["vodafone-2381249", "Vodafone-2381249", "good", true, false, 76],
  ["vodafone-3331205", "Vodafone-3331205", "ok", true, false, 68],
  ["guest", "Guest Network", "ok", false, true, 61],
  ["coffee", "Coffee Shop", "weak", false, false, 52],
  ["neighbour", "Neighbour", "weak", true, false, 45],
  ["overflow", "Ninth Network", "weak", true, false, 31],
].map(([id, name, signal, secure, known, strength]) => ({
  id: String(id),
  name: String(name),
  iconName: `network-wireless-signal-${String(signal)}-symbolic`,
  secure: Boolean(secure),
  known: Boolean(known),
  strength: Number(strength),
}))

const fixtureBluetoothDevices: ReadonlyArray<BluetoothDevicePresentation> = [
  {
    id: "headphones",
    name: "Headphones 1234",
    iconName: "audio-headphones-symbolic",
    connected: true,
    paired: true,
    connecting: false,
    batteryPercentage: 76,
  },
  {
    id: "mouse",
    name: "Mouse 4321",
    iconName: "input-mouse-symbolic",
    connected: false,
    paired: true,
    connecting: false,
    batteryPercentage: 54,
  },
]

const fixturePowerProfiles: ReadonlyArray<PowerProfilePresentation> = [
  {
    id: "performance",
    label: "Performance",
    iconName: "power-profile-performance-symbolic",
  },
  { id: "balanced", label: "Balanced", iconName: "power-profile-balanced-symbolic" },
  {
    id: "power-saver",
    label: "Power Saver",
    iconName: "power-profile-power-saver-symbolic",
  },
]

const fixtureWiredConnections: ReadonlyArray<ConnectionPresentation> = [
  {
    id: "wired-1",
    name: "Wired Connection 1",
    iconName: "network-wired-symbolic",
    connected: true,
    subtitle: null,
  },
  {
    id: "wired-dock",
    name: "Dock Ethernet",
    iconName: "network-wired-symbolic",
    connected: false,
    subtitle: null,
  },
]

const fixtureVpnConnections: ReadonlyArray<ConnectionPresentation> = [
  {
    id: "server-1234",
    name: "Server 1234",
    iconName: "network-vpn-symbolic",
    connected: true,
    subtitle: "Work VPN",
  },
  {
    id: "server-2345",
    name: "Server 2345",
    iconName: "network-vpn-symbolic",
    connected: false,
    subtitle: null,
  },
]

const fixtureMobileConnections: ReadonlyArray<ConnectionPresentation> = [
  {
    id: "carrier-abc",
    name: "Carrier ABC",
    iconName: "network-cellular-signal-excellent-symbolic",
    connected: true,
    subtitle: "5G",
  },
  {
    id: "carrier-backup",
    name: "Backup SIM",
    iconName: "network-cellular-signal-good-symbolic",
    connected: false,
    subtitle: "LTE",
  },
]

const fixtureTethers: ReadonlyArray<ConnectionPresentation> = [
  {
    id: "phone-abc",
    name: "Phone ABC",
    iconName: "smartphone-symbolic",
    connected: false,
    subtitle: null,
  },
]

const fixtureBackgroundApps: ReadonlyArray<BackgroundAppPresentation> = [
  {
    id: "nextcloud",
    name: "Nextcloud",
    iconName: "folder-cloud-symbolic",
    status: "Synchronizing (40 / 90 MB)",
  },
  {
    id: "telegram",
    name: "Telegram",
    iconName: "mail-unread-symbolic",
    status: "3982 messages",
  },
  { id: "mozilla-vpn", name: "Mozilla VPN", iconName: "network-vpn-symbolic", status: null },
]

function connectionRadio(
  available: boolean,
  enabled: boolean,
  iconName: string,
  connections: ReadonlyArray<ConnectionPresentation>,
): RadioConnectionsPresentation {
  return {
    available,
    enabled,
    activeConnectionIds: enabled
      ? connections.filter((connection) => connection.connected).map((connection) => connection.id)
      : [],
    iconName,
    connections: connections.map((connection) => ({
      ...connection,
      connected: enabled && connection.connected,
    })),
  }
}

function baseState(): QuickSettingsState {
  return {
    battery: {
      available: true,
      percentage: 0.56,
      iconName: "battery-good-symbolic",
      charging: false,
    },
    brightness: { available: true, value: 0.72, iconName: "display-brightness-symbolic" },
    audio: {
      available: true,
      volume: 0.64,
      muted: false,
      iconName: "audio-volume-high-symbolic",
      activeOutputId: "built-in",
      outputs: fixtureAudioOutputs.map((output) => ({ ...output })),
    },
    wifi: {
      available: true,
      enabled: true,
      activeNetworkId: "office",
      activeNetworkName: "Office",
      iconName: "network-wireless-signal-excellent-symbolic",
      scanning: false,
      networks: fixtureWifiNetworks.map((network) => ({ ...network })),
    },
    wired: {
      available: false,
      enabled: false,
      activeConnectionId: null,
      iconName: "network-wired-disconnected-symbolic",
      connections: [],
    },
    vpn: connectionRadio(false, false, "network-vpn-symbolic", []),
    mobile: connectionRadio(false, false, "network-cellular-offline-symbolic", []),
    bluetoothTether: connectionRadio(false, false, "network-cellular-symbolic", []),
    bluetooth: {
      available: true,
      enabled: true,
      devices: fixtureBluetoothDevices.map((device) => ({ ...device })),
    },
    powerMode: {
      available: true,
      activeProfile: "balanced",
      iconName: "power-profile-balanced-symbolic",
      profiles: fixturePowerProfiles.map((profile) => ({ ...profile })),
    },
    darkMode: { available: true, enabled: false },
    nightLight: { available: true, enabled: false },
    airplaneMode: { available: true, enabled: false },
    autoRotate: { available: false, enabled: false },
    backgroundApps: {
      available: true,
      apps: fixtureBackgroundApps.map((app) => ({ ...app })),
    },
    privacy: {
      microphone: false,
      camera: false,
      location: false,
      screenRecording: { active: false, elapsedSeconds: 0 },
      casts: [],
    },
    session: {
      screenshot: true,
      lock: true,
      suspend: true,
      reboot: true,
      powerOff: true,
      logOut: true,
      switchUser: true,
      locked: false,
    },
    pending: null,
    error: null,
  }
}

function desktopState(locked: boolean): QuickSettingsState {
  const state = baseState()
  return {
    ...state,
    battery: { ...state.battery, available: false },
    brightness: { ...state.brightness, available: false },
    audio: { ...state.audio, available: false, activeOutputId: null, outputs: [] },
    wifi: {
      ...state.wifi,
      available: false,
      enabled: false,
      activeNetworkId: null,
      activeNetworkName: null,
      networks: [],
    },
    wired: {
      available: true,
      enabled: true,
      activeConnectionId: "wired-1",
      iconName: "network-wired-symbolic",
      connections: fixtureWiredConnections.map((connection) => ({ ...connection })),
    },
    bluetooth: { available: false, enabled: false, devices: [] },
    airplaneMode: { available: false, enabled: false },
    backgroundApps: { available: false, apps: [] },
    session: { ...state.session, locked },
  }
}

function complexState(): QuickSettingsState {
  const state = baseState()
  return {
    ...state,
    wired: {
      available: true,
      enabled: true,
      activeConnectionId: "wired-1",
      iconName: "network-wired-symbolic",
      connections: fixtureWiredConnections.map((connection) => ({ ...connection })),
    },
    vpn: connectionRadio(true, true, "network-vpn-symbolic", fixtureVpnConnections),
    mobile: connectionRadio(
      true,
      true,
      "network-cellular-signal-excellent-symbolic",
      fixtureMobileConnections,
    ),
    bluetoothTether: connectionRadio(true, true, "network-cellular-symbolic", fixtureTethers),
    autoRotate: { available: true, enabled: true },
    privacy: {
      microphone: true,
      camera: true,
      location: true,
      screenRecording: { active: true, elapsedSeconds: 32 },
      casts: [
        { id: "cast-1", name: "Display 1", source: "Window 42", controllable: true },
        { id: "external-cast", name: "External Share", source: null, controllable: false },
      ],
    },
  }
}

function emptyState(): QuickSettingsState {
  const state = baseState()
  return {
    ...state,
    wifi: {
      ...state.wifi,
      enabled: false,
      activeNetworkId: null,
      activeNetworkName: null,
      iconName: "network-wireless-offline-symbolic",
      networks: [],
    },
    vpn: connectionRadio(true, false, "network-vpn-symbolic", []),
    bluetooth: { ...state.bluetooth, devices: [] },
    backgroundApps: { available: false, apps: [] },
  }
}

export interface QuickSettingsModule {
  snapshot(): QuickSettingsState
  subscribe(listener: (state: QuickSettingsState) => void): () => void
  dispatch(action: QuickSettingsAction): void
  stop(): void
}

export function fixtureQuickSettingsState(
  profile: QuickSettingsFixtureProfile = "laptop",
): QuickSettingsState {
  switch (profile) {
    case "desktop":
      return desktopState(false)
    case "complex":
      return complexState()
    case "lockscreen-laptop": {
      const state = baseState()
      return { ...state, session: { ...state.session, locked: true } }
    }
    case "lockscreen-desktop":
      return desktopState(true)
    case "empty-states":
      return emptyState()
    case "laptop":
      return baseState()
  }
}

function updateRadioConnection(
  presentation: RadioConnectionsPresentation,
  id: string,
): RadioConnectionsPresentation | null {
  if (!presentation.available || !presentation.enabled) return null
  const selected = presentation.connections.find((connection) => connection.id === id)
  if (!selected) return null
  const connections = presentation.connections.map((connection) =>
    connection.id === id ? { ...connection, connected: !connection.connected } : connection,
  )
  return {
    ...presentation,
    activeConnectionIds: connections
      .filter((connection) => connection.connected)
      .map((connection) => connection.id),
    connections,
  }
}

function reduceFixtureQuickSettings(
  state: QuickSettingsState,
  action: QuickSettingsAction,
): QuickSettingsState {
  switch (action.type) {
    case "set-volume":
      if (!state.audio.available || !Number.isFinite(action.value)) return state
      return {
        ...state,
        audio: { ...state.audio, volume: Math.max(0, Math.min(1, action.value)) },
      }
    case "toggle-mute":
      if (!state.audio.available) return state
      return { ...state, audio: { ...state.audio, muted: !state.audio.muted } }
    case "set-brightness":
      if (!state.brightness.available || !Number.isFinite(action.value)) return state
      return {
        ...state,
        brightness: { ...state.brightness, value: Math.max(0, Math.min(1, action.value)) },
      }
    case "select-audio-output":
      if (!state.audio.available || !state.audio.outputs.some((output) => output.id === action.id))
        return state
      return { ...state, audio: { ...state.audio, activeOutputId: action.id } }
    case "toggle-wifi":
      if (!state.wifi.available) return state
      return {
        ...state,
        wifi: {
          ...state.wifi,
          enabled: !state.wifi.enabled,
          activeNetworkId: null,
          activeNetworkName: null,
          scanning: false,
        },
        airplaneMode: state.wifi.enabled
          ? state.airplaneMode
          : { ...state.airplaneMode, enabled: false },
      }
    case "scan-wifi":
      if (!state.wifi.available || !state.wifi.enabled) return state
      return { ...state, wifi: { ...state.wifi, scanning: true } }
    case "connect-wifi": {
      if (!state.wifi.available || !state.wifi.enabled) return state
      const network = state.wifi.networks.find((candidate) => candidate.id === action.id)
      if (!network) return state
      return {
        ...state,
        wifi: {
          ...state.wifi,
          activeNetworkId: network.id,
          activeNetworkName: network.name,
          scanning: false,
        },
      }
    }
    case "toggle-wired-connection": {
      if (!state.wired.available || !state.wired.enabled) return state
      const selected = state.wired.connections.find((connection) => connection.id === action.id)
      if (!selected) return state
      const connections = state.wired.connections.map((connection) => ({
        ...connection,
        connected: selected.connected ? false : connection.id === action.id,
      }))
      return {
        ...state,
        wired: {
          ...state.wired,
          activeConnectionId: selected.connected ? null : selected.id,
          connections,
        },
      }
    }
    case "toggle-vpn": {
      const vpn = updateRadioConnection(state.vpn, action.id)
      return vpn ? { ...state, vpn } : state
    }
    case "toggle-mobile-connection": {
      const mobile = updateRadioConnection(state.mobile, action.id)
      return mobile ? { ...state, mobile } : state
    }
    case "toggle-bluetooth-tether": {
      const bluetoothTether = updateRadioConnection(state.bluetoothTether, action.id)
      return bluetoothTether ? { ...state, bluetoothTether } : state
    }
    case "toggle-bluetooth":
      if (!state.bluetooth.available) return state
      return {
        ...state,
        bluetooth: {
          ...state.bluetooth,
          enabled: !state.bluetooth.enabled,
          devices: state.bluetooth.enabled
            ? state.bluetooth.devices.map((device) => ({
                ...device,
                connected: false,
                connecting: false,
              }))
            : state.bluetooth.devices,
        },
        airplaneMode: state.bluetooth.enabled
          ? state.airplaneMode
          : { ...state.airplaneMode, enabled: false },
      }
    case "toggle-bluetooth-device": {
      if (!state.bluetooth.available || !state.bluetooth.enabled) return state
      const selected = state.bluetooth.devices.find((device) => device.id === action.id)
      if (!selected?.paired) return state
      const devices = state.bluetooth.devices.map((device) =>
        device.id === action.id ? { ...device, connected: !device.connected } : device,
      )
      return { ...state, bluetooth: { ...state.bluetooth, devices } }
    }
    case "set-power-profile":
      if (
        !state.powerMode.available ||
        !state.powerMode.profiles.some((profile) => profile.id === action.id)
      )
        return state
      return { ...state, powerMode: { ...state.powerMode, activeProfile: action.id } }
    case "set-dark-mode":
      if (!state.darkMode.available) return state
      return { ...state, darkMode: { ...state.darkMode, enabled: action.enabled } }
    case "set-night-light":
      if (!state.nightLight.available) return state
      return { ...state, nightLight: { ...state.nightLight, enabled: action.enabled } }
    case "set-auto-rotate":
      if (!state.autoRotate.available) return state
      return { ...state, autoRotate: { ...state.autoRotate, enabled: action.enabled } }
    case "stop-background-app": {
      if (!state.backgroundApps.available) return state
      if (!state.backgroundApps.apps.some((app) => app.id === action.id)) return state
      const apps = state.backgroundApps.apps.filter((app) => app.id !== action.id)
      return {
        ...state,
        backgroundApps: { available: apps.length > 0, apps },
      }
    }
    case "stop-screen-recording":
      if (!state.privacy.screenRecording.active) return state
      return {
        ...state,
        privacy: {
          ...state.privacy,
          screenRecording: { active: false, elapsedSeconds: 0 },
        },
      }
    case "stop-cast": {
      if (!state.privacy.casts.some((cast) => cast.id === action.id && cast.controllable))
        return state
      return {
        ...state,
        privacy: {
          ...state.privacy,
          casts: state.privacy.casts.filter((cast) => cast.id !== action.id),
        },
      }
    }
    case "lock":
      if (!state.session.lock) return state
      return { ...state, session: { ...state.session, locked: true } }
    case "session": {
      const available =
        action.action === "suspend"
          ? state.session.suspend
          : action.action === "reboot"
            ? state.session.reboot
            : action.action === "power-off"
              ? state.session.powerOff
              : action.action === "log-out"
                ? state.session.logOut
                : state.session.switchUser
      if (!available) return state
      return action.action === "switch-user"
        ? { ...state, session: { ...state.session, locked: true } }
        : state
    }
    case "clear-error":
      return state.error === null ? state : { ...state, error: null }
    case "set-airplane-mode":
    case "take-screenshot":
      return state
  }
}

interface RadioRestore {
  readonly wifi: boolean
  readonly bluetooth: boolean
  readonly mobile: boolean
}

function setAirplaneMode(
  state: QuickSettingsState,
  enabled: boolean,
  restore: RadioRestore | null,
): readonly [QuickSettingsState, RadioRestore | null] {
  if (!state.airplaneMode.available || enabled === state.airplaneMode.enabled) {
    return [state, restore]
  }
  if (enabled) {
    return [
      {
        ...state,
        wifi: {
          ...state.wifi,
          enabled: false,
          activeNetworkId: null,
          activeNetworkName: null,
          scanning: false,
        },
        bluetooth: {
          ...state.bluetooth,
          enabled: false,
          devices: state.bluetooth.devices.map((device) => ({
            ...device,
            connected: false,
            connecting: false,
          })),
        },
        mobile: {
          ...state.mobile,
          enabled: false,
          activeConnectionIds: [],
          connections: state.mobile.connections.map((connection) => ({
            ...connection,
            connected: false,
          })),
        },
        airplaneMode: { ...state.airplaneMode, enabled: true },
      },
      {
        wifi: state.wifi.available && state.wifi.enabled,
        bluetooth: state.bluetooth.available && state.bluetooth.enabled,
        mobile: state.mobile.available && state.mobile.enabled,
      },
    ]
  }
  return [
    {
      ...state,
      wifi: { ...state.wifi, enabled: restore?.wifi ?? state.wifi.available },
      bluetooth: { ...state.bluetooth, enabled: restore?.bluetooth ?? state.bluetooth.available },
      mobile: { ...state.mobile, enabled: restore?.mobile ?? state.mobile.available },
      airplaneMode: { ...state.airplaneMode, enabled: false },
    },
    null,
  ]
}

export function createFixtureQuickSettingsModule(
  profile: QuickSettingsFixtureProfile = "laptop",
): QuickSettingsModule {
  let state = fixtureQuickSettingsState(profile)
  let radioRestore: RadioRestore | null = null
  let stopped = false
  const listeners = new Set<(state: QuickSettingsState) => void>()

  return {
    snapshot: () => state,
    subscribe: (listener) => {
      if (stopped) return () => {}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispatch: (action) => {
      if (stopped) return
      let next: QuickSettingsState
      if (action.type === "set-airplane-mode") {
        const result = setAirplaneMode(state, action.enabled, radioRestore)
        next = result[0]
        radioRestore = result[1]
      } else {
        next = reduceFixtureQuickSettings(state, action)
        if (state.airplaneMode.enabled && !next.airplaneMode.enabled) radioRestore = null
      }
      if (Object.is(next, state)) return
      state = next
      for (const listener of listeners) listener(state)
    },
    stop: () => {
      if (stopped) return
      stopped = true
      listeners.clear()
    },
  }
}
