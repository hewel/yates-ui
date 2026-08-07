export interface BatteryPresentation {
  readonly available: boolean
  readonly percentage: number
  readonly iconName: string
  readonly charging: boolean
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

export interface WifiNetworkPresentation {
  readonly id: string
  readonly name: string
  readonly iconName: string
  readonly secure: boolean
  readonly known: boolean
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

export interface WiredPresentation {
  readonly available: boolean
  readonly connected: boolean
  readonly iconName: string
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

export interface SessionPresentation {
  readonly screenshot: boolean
  readonly lock: boolean
  readonly suspend: boolean
  readonly reboot: boolean
  readonly powerOff: boolean
}

export interface QuickSettingsState {
  readonly battery: BatteryPresentation
  readonly audio: AudioPresentation
  readonly wifi: WifiPresentation
  readonly wired: WiredPresentation
  readonly bluetooth: BluetoothPresentation
  readonly powerMode: PowerModePresentation
  readonly darkMode: TogglePresentation
  readonly nightLight: TogglePresentation
  readonly session: SessionPresentation
  readonly pendingAction: string | null
  readonly errorMessage: string | null
}

export type SessionAction = "suspend" | "reboot" | "power-off"

export type QuickSettingsAction =
  | { readonly type: "set-volume"; readonly value: number }
  | { readonly type: "select-audio-output"; readonly id: string }
  | { readonly type: "toggle-wifi" }
  | { readonly type: "scan-wifi" }
  | { readonly type: "connect-wifi"; readonly id: string }
  | { readonly type: "toggle-bluetooth" }
  | { readonly type: "toggle-bluetooth-device"; readonly id: string }
  | { readonly type: "set-power-profile"; readonly id: string }
  | { readonly type: "set-dark-mode"; readonly enabled: boolean }
  | { readonly type: "set-night-light"; readonly enabled: boolean }
  | { readonly type: "take-screenshot" }
  | { readonly type: "lock" }
  | { readonly type: "session"; readonly action: SessionAction }
  | { readonly type: "clear-error" }

const fixtureAudioOutputs: ReadonlyArray<AudioOutputPresentation> = [
  {
    id: "built-in",
    name: "Built-in Audio",
    iconName: "audio-speakers-symbolic",
  },
  {
    id: "headphones",
    name: "Headphones",
    iconName: "audio-headphones-symbolic",
  },
]

const fixtureWifiNetworks: ReadonlyArray<WifiNetworkPresentation> = [
  {
    id: "office",
    name: "Office",
    iconName: "network-wireless-signal-excellent-symbolic",
    secure: true,
    known: true,
  },
  {
    id: "guest",
    name: "Guest Network",
    iconName: "network-wireless-signal-good-symbolic",
    secure: false,
    known: true,
  },
]

const fixtureBluetoothDevices: ReadonlyArray<BluetoothDevicePresentation> = [
  {
    id: "headphones",
    name: "Headphones",
    iconName: "audio-headphones-symbolic",
    connected: true,
    paired: true,
    connecting: false,
    batteryPercentage: 76,
  },
  {
    id: "mouse",
    name: "Mouse",
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
  {
    id: "balanced",
    label: "Balanced",
    iconName: "power-profile-balanced-symbolic",
  },
  {
    id: "power-saver",
    label: "Power Saver",
    iconName: "power-profile-power-saver-symbolic",
  },
]

export interface QuickSettingsModule {
  snapshot(): QuickSettingsState
  subscribe(listener: (state: QuickSettingsState) => void): () => void
  dispatch(action: QuickSettingsAction): void
  stop(): void
}

export function fixtureQuickSettingsState(): QuickSettingsState {
  return {
    battery: {
      available: true,
      percentage: 0.76,
      iconName: "battery-good-symbolic",
      charging: false,
    },
    audio: {
      available: true,
      volume: 0.64,
      muted: false,
      iconName: "audio-volume-high-symbolic",
      activeOutputId: "built-in",
      outputs: fixtureAudioOutputs,
    },
    wifi: {
      available: true,
      enabled: true,
      activeNetworkId: "office",
      activeNetworkName: "Office",
      iconName: "network-wireless-signal-excellent-symbolic",
      scanning: false,
      networks: fixtureWifiNetworks,
    },
    wired: {
      available: false,
      connected: false,
      iconName: "network-wired-disconnected-symbolic",
    },
    bluetooth: {
      available: true,
      enabled: true,
      devices: fixtureBluetoothDevices,
    },
    powerMode: {
      available: true,
      activeProfile: "balanced",
      iconName: "power-profile-balanced-symbolic",
      profiles: fixturePowerProfiles,
    },
    darkMode: { available: true, enabled: true },
    nightLight: { available: true, enabled: false },
    session: {
      screenshot: true,
      lock: true,
      suspend: true,
      reboot: true,
      powerOff: true,
    },
    pendingAction: null,
    errorMessage: null,
  }
}

function reduceFixtureQuickSettings(
  state: QuickSettingsState,
  action: QuickSettingsAction,
): QuickSettingsState {
  switch (action.type) {
    case "set-volume":
      if (!Number.isFinite(action.value)) return state
      return {
        ...state,
        audio: { ...state.audio, volume: Math.max(0, Math.min(1, action.value)) },
      }
    case "select-audio-output":
      if (!state.audio.outputs.some((output) => output.id === action.id)) return state
      return {
        ...state,
        audio: { ...state.audio, activeOutputId: action.id },
      }
    case "toggle-wifi":
      return {
        ...state,
        wifi: {
          ...state.wifi,
          enabled: !state.wifi.enabled,
          activeNetworkId: null,
          activeNetworkName: null,
        },
      }
    case "scan-wifi":
      return { ...state, wifi: { ...state.wifi, scanning: true } }
    case "connect-wifi":
      if (!state.wifi.enabled) return state
      const network = state.wifi.networks.find((candidate) => candidate.id === action.id)
      if (!network) return state
      return {
        ...state,
        wifi: {
          ...state.wifi,
          activeNetworkId: network.id,
          activeNetworkName: network.name,
        },
      }
    case "toggle-bluetooth":
      return {
        ...state,
        bluetooth: {
          ...state.bluetooth,
          enabled: !state.bluetooth.enabled,
          devices: state.bluetooth.enabled
            ? state.bluetooth.devices.map((device) => ({ ...device, connected: false }))
            : state.bluetooth.devices,
        },
      }
    case "toggle-bluetooth-device": {
      if (!state.bluetooth.enabled) return state
      if (!state.bluetooth.devices.some((device) => device.id === action.id)) return state
      const devices = state.bluetooth.devices.map((device) =>
        device.id === action.id ? { ...device, connected: !device.connected } : device,
      )
      return {
        ...state,
        bluetooth: {
          ...state.bluetooth,
          devices,
        },
      }
    }
    case "set-power-profile":
      if (!state.powerMode.profiles.some((profile) => profile.id === action.id)) return state
      return {
        ...state,
        powerMode: {
          ...state.powerMode,
          activeProfile: action.id,
        },
      }
    case "set-dark-mode":
      return { ...state, darkMode: { ...state.darkMode, enabled: action.enabled } }
    case "set-night-light":
      return { ...state, nightLight: { ...state.nightLight, enabled: action.enabled } }
    case "clear-error":
      return { ...state, errorMessage: null }
    case "take-screenshot":
    case "lock":
    case "session":
      return state
  }
}

export function createFixtureQuickSettingsModule(): QuickSettingsModule {
  let state = fixtureQuickSettingsState()
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
      const next = reduceFixtureQuickSettings(state, action)
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
