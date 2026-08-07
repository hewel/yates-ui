import Battery from "gi://AstalBattery"
import Bluetooth from "gi://AstalBluetooth"
import Network from "gi://AstalNetwork"
import PowerProfiles from "gi://AstalPowerProfiles"
import Wp from "gi://AstalWp"
import Gio from "gi://Gio"
import GLib from "gi://GLib"

import { Effect, Schema } from "effect"

import { diagnosticLog } from "../debug/log"
import { AutoRotateController, createAutoRotateController } from "./quickSettings/autoRotate"
import { readBacklightSnapshot, setBacklight } from "./quickSettings/backlight"
import {
  SavedConnectionKind,
  SavedConnectionSnapshot,
  readNetworkManagerSnapshot,
  toggleSavedConnection,
  unavailableNetworkManagerSnapshot,
  watchNetworkManager,
} from "./quickSettings/networkManager"
import { createSessionController } from "./quickSettings/session"
import {
  ConnectionPresentation,
  QuickSettingsAction,
  QuickSettingsFixtureProfile,
  QuickSettingsModule,
  QuickSettingsPending,
  QuickSettingsState,
  audioAvailableFromOutputs,
  createFixtureQuickSettingsModule,
} from "./quickSettingsModel"

class QuickSettingsActionError extends Schema.TaggedError<QuickSettingsActionError>()(
  "QuickSettingsActionError",
  {
    operation: Schema.String,
    cause: Schema.Defect,
  },
) {}

function unavailableState(): QuickSettingsState {
  return {
    battery: {
      available: false,
      percentage: 0,
      iconName: "battery-missing-symbolic",
      charging: false,
    },
    brightness: {
      available: false,
      value: 0,
      iconName: "display-brightness-symbolic",
    },
    audio: {
      available: false,
      volume: 0,
      muted: false,
      iconName: "audio-volume-muted-symbolic",
      activeOutputId: null,
      outputs: [],
    },
    wifi: {
      available: false,
      enabled: false,
      activeNetworkId: null,
      activeNetworkName: null,
      iconName: "network-wireless-offline-symbolic",
      scanning: false,
      networks: [],
    },
    wired: {
      available: false,
      enabled: false,
      activeConnectionId: null,
      iconName: "network-wired-disconnected-symbolic",
      connections: [],
    },
    vpn: {
      available: false,
      enabled: false,
      activeConnectionIds: [],
      iconName: "network-vpn-symbolic",
      connections: [],
    },
    mobile: {
      available: false,
      enabled: false,
      activeConnectionIds: [],
      iconName: "network-cellular-offline-symbolic",
      connections: [],
    },
    bluetoothTether: {
      available: false,
      enabled: false,
      activeConnectionIds: [],
      iconName: "network-cellular-symbolic",
      connections: [],
    },
    bluetooth: {
      available: false,
      enabled: false,
      devices: [],
    },
    powerMode: {
      available: false,
      activeProfile: "",
      iconName: "power-profile-balanced-symbolic",
      profiles: [],
    },
    darkMode: { available: false, enabled: false },
    nightLight: { available: false, enabled: false },
    airplaneMode: { available: false, enabled: false },
    autoRotate: { available: false, enabled: false },
    backgroundApps: { available: false, apps: [] },
    privacy: {
      microphone: false,
      camera: false,
      location: false,
      screenRecording: { active: false, elapsedSeconds: 0 },
      casts: [],
    },
    session: {
      screenshot: false,
      lock: false,
      suspend: false,
      reboot: false,
      powerOff: false,
      logOut: false,
      switchUser: false,
      locked: false,
    },
    pending: null,
    error: null,
  }
}

function optionalSettings(schemaId: string): Gio.Settings | null {
  const schema = Gio.SettingsSchemaSource.get_default()?.lookup(schemaId, true)
  return schema ? Gio.Settings.new_full(schema, null, null) : null
}

function profileLabel(profile: string): string {
  switch (profile) {
    case "performance":
      return "Performance"
    case "power-saver":
      return "Power Saver"
    case "balanced":
      return "Balanced"
    default:
      return profile
  }
}

function profileIcon(profile: string): string {
  switch (profile) {
    case "performance":
      return "power-profile-performance-symbolic"
    case "power-saver":
      return "power-profile-power-saver-symbolic"
    default:
      return "power-profile-balanced-symbolic"
  }
}

function actionError(operation: string) {
  return (cause: unknown) => QuickSettingsActionError.make({ operation, cause })
}

function runCleanups(operation: string, cleanups: ReadonlyArray<() => void>): void {
  for (const cleanup of cleanups) {
    Effect.runSync(
      Effect.try({ try: cleanup, catch: actionError(operation) }).pipe(
        Effect.catchTag("QuickSettingsActionError", (error) =>
          Effect.sync(() => {
            diagnosticLog("quick-settings.cleanup.failed", {
              operation: error.operation,
              error: String(error.cause),
            })
          }),
        ),
      ),
    )
  }
}

function canLogindAction(answer: string): boolean {
  return answer === "yes" || answer === "challenge"
}

function connectionIcon(kind: SavedConnectionKind, connected: boolean): string {
  switch (kind) {
    case "wired":
      return connected ? "network-wired-symbolic" : "network-wired-disconnected-symbolic"
    case "vpn":
      return "network-vpn-symbolic"
    case "mobile":
      return connected
        ? "network-cellular-signal-excellent-symbolic"
        : "network-cellular-offline-symbolic"
    case "bluetooth-tether":
      return "network-cellular-symbolic"
  }
}

function connectionPresentation(
  kind: SavedConnectionKind,
  connection: SavedConnectionSnapshot,
): ConnectionPresentation {
  return {
    id: connection.id,
    name: connection.name,
    iconName: connectionIcon(kind, connection.active),
    connected: connection.active,
    subtitle: null,
  }
}

function connectionPresentations(
  kind: SavedConnectionKind,
  connections: ReadonlyArray<SavedConnectionSnapshot>,
): ReadonlyArray<ConnectionPresentation> {
  return connections.slice(0, 8).map((connection) => connectionPresentation(kind, connection))
}

function actionTarget(action: QuickSettingsAction): string | null {
  switch (action.type) {
    case "select-audio-output":
    case "connect-wifi":
    case "toggle-wired-connection":
    case "toggle-vpn":
    case "toggle-mobile-connection":
    case "toggle-bluetooth-tether":
    case "toggle-bluetooth-device":
    case "set-power-profile":
    case "stop-background-app":
    case "stop-cast":
      return action.id
    case "session":
      return action.action
    default:
      return null
  }
}

function fixtureProfile(value: string | null): QuickSettingsFixtureProfile {
  switch (value) {
    case "desktop":
    case "complex":
    case "lockscreen-laptop":
    case "lockscreen-desktop":
    case "empty-states":
    case "laptop":
      return value
    default:
      return "laptop"
  }
}

function createLiveQuickSettingsModule(niriSocketPath: string | null): QuickSettingsModule {
  const battery = Battery.Device.get_default()
  const network = Network.get_default()
  const networkClient: ReturnType<typeof network.get_client> | null = network.client
  const bluetooth = Bluetooth.get_default()
  const wp = Wp.get_default()
  const audio = wp.audio
  const powerProfiles = PowerProfiles.get_default()
  const appearance = optionalSettings("org.gnome.desktop.interface")
  const color = optionalSettings("org.gnome.settings-daemon.plugins.color")
  const screenshotProgram = GLib.find_program_in_path("grim")
  const sessionId = GLib.getenv("XDG_SESSION_ID")
  const cancellable = new Gio.Cancellable()
  let systemBus: Gio.DBusConnection | null = null
  let sessionLocked = false
  let airplaneRestore: {
    readonly wifi: boolean | null
    readonly wwan: boolean | null
    readonly bluetooth: boolean | null
  } | null = null
  let applyingAirplaneMode = false
  let stopped = false
  let state = unavailableState()
  const listeners = new Set<(next: QuickSettingsState) => void>()
  const disconnectors: Array<() => void> = []
  let wifiDisconnectors: Array<() => void> = []
  let speakerDisconnectors: Array<() => void> = []
  let outputDisconnectors: Array<() => void> = []
  let bluetoothDeviceDisconnectors: Array<() => void> = []
  let logindSubscription = 0
  let backlightTimer = 0
  let sessionController: ReturnType<typeof createSessionController> | null = null
  let autoRotateController: AutoRotateController | null = null
  let actionSequence = 0

  const publish = (next: QuickSettingsState): void => {
    if (stopped) return
    state = next
    for (const listener of listeners) listener(state)
  }

  const readState = (): QuickSettingsState => {
    const wifi = network.wifi
    const activeAccessPoint = wifi?.get_active_access_point() ?? null
    const seenWifiNames = new Set<string>()
    const wifiNetworks = (wifi?.get_access_points() ?? [])
      .filter((accessPoint) => accessPoint.ssid !== null)
      .sort((left, right) => {
        const leftActive = left.bssid === activeAccessPoint?.bssid
        const rightActive = right.bssid === activeAccessPoint?.bssid
        if (leftActive !== rightActive) return leftActive ? -1 : 1
        return right.strength - left.strength
      })
      .filter((accessPoint) => {
        const name = accessPoint.ssid
        if (name === null || seenWifiNames.has(name)) return false
        seenWifiNames.add(name)
        return true
      })
      .map((accessPoint) => ({
        id: accessPoint.bssid,
        name: accessPoint.ssid ?? "Unknown Network",
        iconName: accessPoint.iconName,
        secure: accessPoint.requiresPassword,
        known: accessPoint.get_connections().length > 0,
        strength: accessPoint.strength,
      }))
      .slice(0, 8)
    const speaker = audio.defaultSpeaker
    const outputs = (audio.get_speakers() ?? []).map((output) => ({
      id: String(output.id),
      name: output.description ?? output.name ?? "Audio Output",
      iconName: output.icon || "audio-speakers-symbolic",
    }))
    const activeOutputId = speaker ? String(speaker.id) : null
    const audioAvailable = audioAvailableFromOutputs(activeOutputId, outputs)
    const devices = bluetooth.devices
      .map((device) => ({
        id: device.address,
        name: device.alias || device.name,
        iconName: device.icon || "bluetooth-symbolic",
        connected: device.connected,
        paired: device.paired,
        connecting: device.connecting,
        batteryPercentage: device.batteryPercentage >= 0 ? device.batteryPercentage : null,
      }))
      .sort((left, right) => {
        if (left.connected !== right.connected) return left.connected ? -1 : 1
        if (left.paired !== right.paired) return left.paired ? -1 : 1
        return left.name.localeCompare(right.name)
      })
    const profiles = powerProfiles.get_profiles().map((profile) => ({
      id: profile.profile,
      label: profileLabel(profile.profile),
      iconName: profileIcon(profile.profile),
    }))
    const networkManager =
      networkClient === null
        ? unavailableNetworkManagerSnapshot
        : readNetworkManagerSnapshot(networkClient)
    const backlight = readBacklightSnapshot()
    const sessionCapabilities = sessionController?.snapshot() ?? {
      logOut: sessionId !== null,
      switchUser: false,
    }
    const bluetoothAvailable = bluetooth.adapter !== null
    const radios: ReadonlyArray<boolean> = [
      ...(networkManager.running && networkManager.wifiAvailable
        ? [networkManager.wifiEnabled]
        : []),
      ...(networkManager.running && networkManager.wwanAvailable
        ? [networkManager.wwanEnabled]
        : []),
      ...(bluetoothAvailable ? [bluetooth.isPowered] : []),
    ]
    const airplaneEnabled = radios.length > 0 && radios.every((enabled) => !enabled)
    if (airplaneRestore !== null && !applyingAirplaneMode && !airplaneEnabled) {
      airplaneRestore = null
    }
    const wiredConnections = connectionPresentations("wired", networkManager.wired)
    const vpnConnections = connectionPresentations("vpn", networkManager.vpn)
    const mobileConnections = connectionPresentations("mobile", networkManager.mobile)
    const tetherConnections = connectionPresentations(
      "bluetooth-tether",
      networkManager.bluetoothTether,
    )
    const activeWired = wiredConnections.find((connection) => connection.connected) ?? null
    const activeVpnIds = vpnConnections
      .filter((connection) => connection.connected)
      .map((connection) => connection.id)
    const activeMobileIds = mobileConnections
      .filter((connection) => connection.connected)
      .map((connection) => connection.id)
    const activeTetherIds = tetherConnections
      .filter((connection) => connection.connected)
      .map((connection) => connection.id)

    return {
      battery: {
        available: Boolean(battery?.isPresent && battery.isBattery && battery.powerSupply),
        percentage: battery?.percentage ?? 0,
        iconName: battery?.batteryIconName ?? "battery-missing-symbolic",
        charging: battery?.charging ?? false,
      },
      brightness: {
        available: backlight.available && systemBus !== null,
        value: backlight.value,
        iconName: "display-brightness-symbolic",
      },
      audio: {
        available: audioAvailable,
        volume: audioAvailable ? (speaker?.volume ?? 0) : 0,
        muted: audioAvailable ? (speaker?.mute ?? false) : false,
        iconName: audioAvailable
          ? (speaker?.volumeIcon ?? "audio-volume-muted-symbolic")
          : "audio-volume-muted-symbolic",
        activeOutputId: audioAvailable ? activeOutputId : null,
        outputs,
      },
      wifi: {
        available: networkManager.running && wifi !== null,
        enabled: wifi?.enabled ?? false,
        activeNetworkId: activeAccessPoint?.bssid ?? null,
        activeNetworkName: activeAccessPoint?.ssid ?? null,
        iconName: wifi?.iconName ?? "network-wireless-offline-symbolic",
        scanning: wifi?.scanning ?? false,
        networks: wifiNetworks,
      },
      wired: {
        available:
          networkManager.running && (network.wired !== null || wiredConnections.length > 0),
        enabled: activeWired !== null,
        activeConnectionId: activeWired?.id ?? null,
        iconName:
          activeWired !== null
            ? "network-wired-symbolic"
            : (network.wired?.iconName ?? "network-wired-disconnected-symbolic"),
        connections: wiredConnections,
      },
      vpn: {
        available: networkManager.running && vpnConnections.length > 0,
        enabled: activeVpnIds.length > 0,
        activeConnectionIds: activeVpnIds,
        iconName: "network-vpn-symbolic",
        connections: vpnConnections,
      },
      mobile: {
        available: networkManager.running && networkManager.wwanAvailable,
        enabled: networkManager.wwanEnabled,
        activeConnectionIds: activeMobileIds,
        iconName:
          activeMobileIds.length > 0
            ? "network-cellular-signal-excellent-symbolic"
            : "network-cellular-offline-symbolic",
        connections: mobileConnections,
      },
      bluetoothTether: {
        available:
          networkManager.running && networkManager.bluetoothTetherAvailable && bluetoothAvailable,
        enabled: bluetooth.isPowered,
        activeConnectionIds: activeTetherIds,
        iconName: "network-cellular-symbolic",
        connections: tetherConnections,
      },
      bluetooth: {
        available: bluetooth.adapter !== null,
        enabled: bluetooth.isPowered,
        devices,
      },
      powerMode: {
        available: profiles.length > 0,
        activeProfile: powerProfiles.activeProfile,
        iconName: powerProfiles.iconName || profileIcon(powerProfiles.activeProfile),
        profiles,
      },
      darkMode: {
        available: appearance?.is_writable("color-scheme") ?? false,
        enabled: appearance?.get_string("color-scheme") === "prefer-dark",
      },
      nightLight: {
        available: color?.is_writable("night-light-enabled") ?? false,
        enabled: color?.get_boolean("night-light-enabled") ?? false,
      },
      airplaneMode: {
        available: radios.length > 0,
        enabled: airplaneEnabled,
      },
      autoRotate: autoRotateController?.snapshot() ?? state.autoRotate,
      backgroundApps: state.backgroundApps,
      privacy: state.privacy,
      session: {
        ...state.session,
        lock: systemBus !== null && sessionId !== null,
        logOut: systemBus !== null && sessionCapabilities.logOut,
        switchUser: systemBus !== null && sessionCapabilities.switchUser,
        locked: sessionLocked,
      },
      pending: state.pending,
      error: state.error,
    }
  }

  const refresh = (): void => {
    if (stopped) return
    Effect.runSync(
      Effect.try({
        try: readState,
        catch: actionError("refresh"),
      }).pipe(
        Effect.match({
          onFailure: (error) => {
            diagnosticLog("quick-settings.refresh.failed", {
              operation: error.operation,
              error: String(error.cause),
            })
          },
          onSuccess: publish,
        }),
      ),
    )
  }

  const reconnectWifi = (): void => {
    runCleanups("wifi-signals", wifiDisconnectors)
    wifiDisconnectors = []
    const wifi = network.wifi
    if (!wifi) return
    const signals = [
      wifi.connect("access-point-added", refresh),
      wifi.connect("access-point-removed", refresh),
      wifi.connect("notify::active-access-point", refresh),
      wifi.connect("notify::enabled", refresh),
      wifi.connect("notify::scanning", refresh),
      wifi.connect("notify::icon-name", refresh),
    ]
    wifiDisconnectors = signals.map((signal) => () => wifi.disconnect(signal))
  }

  const reconnectAudio = (): void => {
    runCleanups("speaker-signals", speakerDisconnectors)
    runCleanups("audio-output-signals", outputDisconnectors)
    speakerDisconnectors = []
    outputDisconnectors = []
    const speaker = audio.defaultSpeaker
    if (speaker) {
      const signals = [
        speaker.connect("notify::volume", refresh),
        speaker.connect("notify::mute", refresh),
        speaker.connect("notify::volume-icon", refresh),
      ]
      speakerDisconnectors = signals.map((signal) => () => speaker.disconnect(signal))
    }
    for (const output of audio.get_speakers() ?? []) {
      const signals = [
        output.connect("notify::description", refresh),
        output.connect("notify::icon", refresh),
        output.connect("notify::is-default", refresh),
      ]
      outputDisconnectors.push(...signals.map((signal) => () => output.disconnect(signal)))
    }
  }

  const reconnectBluetoothDevices = (): void => {
    runCleanups("bluetooth-device-signals", bluetoothDeviceDisconnectors)
    bluetoothDeviceDisconnectors = []
    for (const device of bluetooth.devices) {
      const signals = [
        device.connect("notify::connected", refresh),
        device.connect("notify::connecting", refresh),
        device.connect("notify::paired", refresh),
        device.connect("notify::battery-percentage", refresh),
      ]
      bluetoothDeviceDisconnectors.push(...signals.map((signal) => () => device.disconnect(signal)))
    }
  }

  const runAction = (
    action: QuickSettingsAction,
    effect: Effect.Effect<void, QuickSettingsActionError>,
  ): void => {
    if (stopped) return
    const pending: QuickSettingsPending = { kind: action.type, targetId: actionTarget(action) }
    if (state.pending?.kind === pending.kind && state.pending.targetId === pending.targetId) return
    const sequence = ++actionSequence
    publish({ ...state, pending, error: null })
    void Effect.runPromise(
      effect.pipe(
        Effect.match({
          onFailure: (error) => {
            diagnosticLog("quick-settings.action.failed", {
              operation: error.operation,
              error: String(error.cause),
            })
            if (sequence !== actionSequence) return
            publish({
              ...state,
              pending: null,
              error: {
                ...pending,
                message: `Unable to complete ${error.operation}`,
              },
            })
          },
          onSuccess: () => {
            refresh()
            if (sequence === actionSequence) publish({ ...state, pending: null, error: null })
          },
        }),
      ),
    )
  }

  const syncAction = (action: QuickSettingsAction, perform: () => void): void => {
    if (stopped) return
    actionSequence += 1
    const pending: QuickSettingsPending = { kind: action.type, targetId: actionTarget(action) }
    publish({ ...state, pending, error: null })
    Effect.runSync(
      Effect.try({
        try: perform,
        catch: actionError(action.type),
      }).pipe(
        Effect.match({
          onFailure: (error) => {
            diagnosticLog("quick-settings.action.failed", {
              operation: error.operation,
              error: String(error.cause),
            })
            publish({
              ...state,
              pending: null,
              error: {
                ...pending,
                message: `Unable to complete ${error.operation}`,
              },
            })
          },
          onSuccess: () => {
            refresh()
            publish({ ...state, pending: null, error: null })
          },
        }),
      ),
    )
  }

  const promiseAction = (action: QuickSettingsAction, perform: () => Promise<unknown>): void =>
    runAction(
      action,
      Effect.tryPromise({
        try: () => perform().then(() => undefined),
        catch: actionError(action.type),
      }),
    )

  const callLogind = (method: string, parameters: GLib.Variant | null): Promise<GLib.Variant> => {
    if (!systemBus) return Promise.reject(new Error("system bus is unavailable"))
    return systemBus.call(
      "org.freedesktop.login1",
      "/org/freedesktop/login1",
      "org.freedesktop.login1.Manager",
      method,
      parameters,
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      cancellable,
    )
  }

  const dispatchSession = (
    request: Extract<QuickSettingsAction, { readonly type: "session" }>,
  ): void => {
    const action = request.action
    const available =
      action === "power-off"
        ? state.session.powerOff
        : action === "reboot"
          ? state.session.reboot
          : action === "suspend"
            ? state.session.suspend
            : action === "log-out"
              ? state.session.logOut
              : state.session.switchUser
    if (!available) return
    if (action === "log-out") {
      const bus = systemBus
      const controller = sessionController
      if (!bus || !controller) return
      promiseAction(request, () => controller.logOut(bus, cancellable))
      return
    }
    if (action === "switch-user") {
      const bus = systemBus
      const controller = sessionController
      if (!bus || !controller) return
      promiseAction(request, () => controller.switchUser(bus, cancellable))
      return
    }
    const method = action === "power-off" ? "PowerOff" : action === "reboot" ? "Reboot" : "Suspend"
    promiseAction(request, () => callLogind(method, new GLib.Variant("(b)", [true])))
  }

  const dispatch = (action: QuickSettingsAction): void => {
    switch (action.type) {
      case "set-volume": {
        const speaker = audio.defaultSpeaker
        if (!speaker) return
        syncAction(action, () => speaker.set_volume(Math.max(0, Math.min(1, action.value))))
        return
      }
      case "toggle-mute": {
        const speaker = audio.defaultSpeaker
        if (!speaker) return
        syncAction(action, () => speaker.set_mute(!speaker.mute))
        return
      }
      case "set-brightness": {
        const bus = systemBus
        if (!bus || !state.brightness.available) return
        promiseAction(action, () => setBacklight(bus, action.value, cancellable))
        return
      }
      case "select-audio-output": {
        const output = (audio.get_speakers() ?? []).find(
          (candidate) => String(candidate.id) === action.id,
        )
        if (!output) return
        syncAction(action, () => output.set_is_default(true))
        return
      }
      case "toggle-wifi": {
        const wifi = network.wifi
        if (!wifi) return
        syncAction(action, () => wifi.set_enabled(!wifi.enabled))
        return
      }
      case "scan-wifi": {
        const wifi = network.wifi
        if (!wifi || !wifi.enabled) return
        syncAction(action, () => wifi.scan())
        return
      }
      case "connect-wifi": {
        const accessPoint = (network.wifi?.get_access_points() ?? []).find(
          (candidate) => candidate.bssid === action.id,
        )
        if (!accessPoint) return
        if (accessPoint.requiresPassword && accessPoint.get_connections().length === 0) {
          publish({
            ...state,
            error: {
              kind: action.type,
              targetId: action.id,
              message: "Open Network Settings to connect to a new secured network",
            },
          })
          return
        }
        promiseAction(action, () => accessPoint.activate(null))
        return
      }
      case "toggle-wired-connection":
        if (networkClient === null) return
        if (!state.wired.connections.some((connection) => connection.id === action.id)) return
        promiseAction(action, () =>
          toggleSavedConnection(networkClient, "wired", action.id, cancellable),
        )
        return
      case "toggle-vpn":
        if (networkClient === null) return
        if (!state.vpn.connections.some((connection) => connection.id === action.id)) return
        promiseAction(action, () =>
          toggleSavedConnection(networkClient, "vpn", action.id, cancellable),
        )
        return
      case "toggle-mobile-connection":
        if (networkClient === null) return
        if (
          !state.mobile.enabled ||
          !state.mobile.connections.some((connection) => connection.id === action.id)
        )
          return
        promiseAction(action, () =>
          toggleSavedConnection(networkClient, "mobile", action.id, cancellable),
        )
        return
      case "toggle-bluetooth-tether":
        if (networkClient === null) return
        if (
          !bluetooth.isPowered ||
          !state.bluetoothTether.connections.some((connection) => connection.id === action.id)
        )
          return
        promiseAction(action, () =>
          toggleSavedConnection(networkClient, "bluetooth-tether", action.id, cancellable),
        )
        return
      case "toggle-bluetooth": {
        const adapter = bluetooth.adapter
        if (!adapter) return
        syncAction(action, () => adapter.set_powered(!adapter.powered))
        return
      }
      case "toggle-bluetooth-device": {
        const device = bluetooth.devices.find((candidate) => candidate.address === action.id)
        if (!device || !bluetooth.isPowered || !device.paired) return
        promiseAction(action, () =>
          device.connected ? device.disconnect_device() : device.connect_device(),
        )
        return
      }
      case "set-power-profile":
        if (!powerProfiles.get_profiles().some((profile) => profile.profile === action.id)) return
        syncAction(action, () => powerProfiles.set_active_profile(action.id))
        return
      case "set-dark-mode":
        if (!appearance?.is_writable("color-scheme")) return
        syncAction(action, () => {
          if (!appearance.set_string("color-scheme", action.enabled ? "prefer-dark" : "default")) {
            throw new Error("color-scheme was not changed")
          }
        })
        return
      case "set-night-light":
        if (!color?.is_writable("night-light-enabled")) return
        syncAction(action, () => {
          if (!color.set_boolean("night-light-enabled", action.enabled)) {
            throw new Error("night-light-enabled was not changed")
          }
        })
        return
      case "set-airplane-mode": {
        if (networkClient === null && bluetooth.adapter === null) return
        if (!state.airplaneMode.available || state.airplaneMode.enabled === action.enabled) return
        syncAction(action, () => {
          const networkManager =
            networkClient === null
              ? unavailableNetworkManagerSnapshot
              : readNetworkManagerSnapshot(networkClient)
          const adapter = bluetooth.adapter
          applyingAirplaneMode = true
          try {
            if (action.enabled) {
              airplaneRestore = {
                wifi:
                  networkManager.running && networkManager.wifiAvailable
                    ? networkManager.wifiEnabled
                    : null,
                wwan:
                  networkManager.running && networkManager.wwanAvailable
                    ? networkManager.wwanEnabled
                    : null,
                bluetooth: adapter !== null ? adapter.powered : null,
              }
              if (networkManager.running && networkManager.wifiAvailable) {
                if (networkClient !== null) networkClient.wireless_enabled = false
              }
              if (networkManager.running && networkManager.wwanAvailable) {
                if (networkClient !== null) networkClient.wwan_enabled = false
              }
              if (adapter !== null) adapter.set_powered(false)
            } else {
              const restore = airplaneRestore
              if (networkManager.running && networkManager.wifiAvailable) {
                if (networkClient !== null) networkClient.wireless_enabled = restore?.wifi ?? true
              }
              if (networkManager.running && networkManager.wwanAvailable) {
                if (networkClient !== null) networkClient.wwan_enabled = restore?.wwan ?? true
              }
              if (adapter !== null) adapter.set_powered(restore?.bluetooth ?? true)
              airplaneRestore = null
            }
          } finally {
            applyingAirplaneMode = false
          }
        })
        return
      }
      case "set-auto-rotate": {
        const controller = autoRotateController
        if (
          !controller ||
          !state.autoRotate.available ||
          state.autoRotate.enabled === action.enabled
        )
          return
        promiseAction(action, () => controller.setEnabled(action.enabled))
        return
      }
      case "stop-background-app":
      case "stop-screen-recording":
      case "stop-cast":
        return
      case "take-screenshot": {
        if (!screenshotProgram) return
        const directory =
          GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES) ?? GLib.get_home_dir()
        const filename = `Screenshot-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.png`
        const path = GLib.build_filenamev([directory, filename])
        promiseAction(action, () => {
          GLib.mkdir_with_parents(directory, 0o755)
          return Gio.Subprocess.new(
            [screenshotProgram, path],
            Gio.SubprocessFlags.NONE,
          ).wait_check_async(cancellable)
        })
        return
      }
      case "lock":
        if (!sessionId) return
        promiseAction(action, () => callLogind("LockSession", new GLib.Variant("(s)", [sessionId])))
        return
      case "session":
        dispatchSession(action)
        return
      case "clear-error":
        publish({ ...state, error: null })
    }
  }

  sessionController = Effect.runSync(
    Effect.try({
      try: () => createSessionController(refresh),
      catch: actionError("accounts-service"),
    }).pipe(
      Effect.match({
        onFailure: (error) => {
          diagnosticLog("quick-settings.accounts-service.unavailable", {
            operation: error.operation,
            error: String(error.cause),
          })
          return null
        },
        onSuccess: (controller) => controller,
      }),
    ),
  )
  if (networkClient !== null) {
    const networkManagerSignals = watchNetworkManager(networkClient, refresh)
    disconnectors.push(networkManagerSignals.stop)
  }

  const networkSignal = network.connect("notify::wifi", () => {
    reconnectWifi()
    refresh()
  })
  const wiredSignal = network.connect("notify::wired", refresh)
  const primarySignal = network.connect("notify::primary", refresh)
  disconnectors.push(
    () => network.disconnect(networkSignal),
    () => network.disconnect(wiredSignal),
    () => network.disconnect(primarySignal),
  )

  const defaultSpeakerSignal = audio.connect("notify::default-speaker", () => {
    reconnectAudio()
    refresh()
  })
  const wpConnectedSignal = wp.connect("notify::connected", () => {
    reconnectAudio()
    refresh()
  })
  const speakerAddedSignal = audio.connect("speaker-added", () => {
    reconnectAudio()
    refresh()
  })
  const speakerRemovedSignal = audio.connect("speaker-removed", () => {
    reconnectAudio()
    refresh()
  })
  disconnectors.push(
    () => wp.disconnect(wpConnectedSignal),
    () => audio.disconnect(defaultSpeakerSignal),
    () => audio.disconnect(speakerAddedSignal),
    () => audio.disconnect(speakerRemovedSignal),
  )

  const bluetoothSignals = [
    bluetooth.connect("notify::is-powered", refresh),
    bluetooth.connect("notify::is-connected", refresh),
    bluetooth.connect("notify::adapter", refresh),
    bluetooth.connect("device-added", () => {
      reconnectBluetoothDevices()
      refresh()
    }),
    bluetooth.connect("device-removed", () => {
      reconnectBluetoothDevices()
      refresh()
    }),
  ]
  disconnectors.push(...bluetoothSignals.map((signal) => () => bluetooth.disconnect(signal)))

  const powerSignals = [
    powerProfiles.connect("notify::active-profile", refresh),
    powerProfiles.connect("notify::icon-name", refresh),
    powerProfiles.connect("notify::performance-degraded", refresh),
  ]
  disconnectors.push(...powerSignals.map((signal) => () => powerProfiles.disconnect(signal)))

  if (battery) {
    const signals = [
      battery.connect("notify::percentage", refresh),
      battery.connect("notify::charging", refresh),
      battery.connect("notify::is-present", refresh),
      battery.connect("notify::is-battery", refresh),
      battery.connect("notify::battery-icon-name", refresh),
    ]
    disconnectors.push(...signals.map((signal) => () => battery.disconnect(signal)))
  }
  if (appearance) {
    const signal = appearance.connect("changed::color-scheme", refresh)
    disconnectors.push(() => appearance.disconnect(signal))
  }
  if (color) {
    const signal = color.connect("changed::night-light-enabled", refresh)
    disconnectors.push(() => color.disconnect(signal))
  }

  reconnectWifi()
  reconnectAudio()
  reconnectBluetoothDevices()
  refresh()
  backlightTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
    refresh()
    return GLib.SOURCE_CONTINUE
  })
  publish({
    ...state,
    session: {
      ...state.session,
      screenshot: screenshotProgram !== null,
    },
  })

  const queryCapability = Effect.fn("quick-settings.query-logind-capability")(function* (
    bus: Gio.DBusConnection,
    method: string,
  ) {
    const reply = yield* Effect.tryPromise({
      try: () =>
        bus.call(
          "org.freedesktop.login1",
          "/org/freedesktop/login1",
          "org.freedesktop.login1.Manager",
          method,
          null,
          new GLib.VariantType("(s)"),
          Gio.DBusCallFlags.NONE,
          -1,
          cancellable,
        ),
      catch: actionError(method),
    })
    return canLogindAction(reply.get_child_value(0).get_string()[0])
  })

  const querySessionLocked = Effect.fn("quick-settings.query-session-locked")(function* (
    bus: Gio.DBusConnection,
    sessionPath: string,
  ) {
    const reply = yield* Effect.tryPromise({
      try: () =>
        bus.call(
          "org.freedesktop.login1",
          sessionPath,
          "org.freedesktop.DBus.Properties",
          "Get",
          new GLib.Variant("(ss)", ["org.freedesktop.login1.Session", "LockedHint"]),
          new GLib.VariantType("(v)"),
          Gio.DBusCallFlags.NONE,
          -1,
          cancellable,
        ),
      catch: actionError("query-session-locked"),
    })
    return reply.get_child_value(0).get_variant().get_boolean()
  })

  const refreshSessionLocked = (bus: Gio.DBusConnection, sessionPath: string): void => {
    void Effect.runPromise(
      querySessionLocked(bus, sessionPath).pipe(
        Effect.match({
          onFailure: (error) => {
            diagnosticLog("quick-settings.session-state.unavailable", {
              operation: error.operation,
              error: String(error.cause),
            })
          },
          onSuccess: (locked) => {
            if (stopped) return
            sessionLocked = locked
            refresh()
          },
        }),
      ),
    )
  }

  const querySessionPath = Effect.fn("quick-settings.query-session-path")(function* (
    bus: Gio.DBusConnection,
    id: string,
  ) {
    const reply = yield* Effect.tryPromise({
      try: () =>
        bus.call(
          "org.freedesktop.login1",
          "/org/freedesktop/login1",
          "org.freedesktop.login1.Manager",
          "GetSession",
          new GLib.Variant("(s)", [id]),
          new GLib.VariantType("(o)"),
          Gio.DBusCallFlags.NONE,
          -1,
          cancellable,
        ),
      catch: actionError("query-session-path"),
    })
    return reply.get_child_value(0).get_string()[0]
  })

  void Effect.runPromise(
    Effect.gen(function* () {
      const bus = yield* Effect.tryPromise({
        try: () => Gio.bus_get(Gio.BusType.SYSTEM, cancellable),
        catch: actionError("connect-logind"),
      })
      if (stopped) return
      systemBus = bus
      autoRotateController = yield* Effect.tryPromise({
        try: () =>
          createAutoRotateController({
            systemBus: bus,
            niriSocketPath,
            cancellable,
            onChanged: refresh,
            onBackgroundError: (cause) => {
              diagnosticLog("quick-settings.auto-rotate.failed", { error: String(cause) })
            },
          }),
        catch: actionError("auto-rotate"),
      }).pipe(
        Effect.catchTag("QuickSettingsActionError", (error) =>
          Effect.sync(() => {
            diagnosticLog("quick-settings.auto-rotate.unavailable", {
              operation: error.operation,
              error: String(error.cause),
            })
            return null
          }),
        ),
      )
      refresh()
      const sessionPath =
        sessionId === null
          ? "/org/freedesktop/login1/session/auto"
          : yield* querySessionPath(bus, sessionId).pipe(
              Effect.catchTag("QuickSettingsActionError", () =>
                Effect.succeed("/org/freedesktop/login1/session/auto"),
              ),
            )
      logindSubscription = bus.signal_subscribe(
        "org.freedesktop.login1",
        "org.freedesktop.DBus.Properties",
        "PropertiesChanged",
        sessionPath,
        "org.freedesktop.login1.Session",
        Gio.DBusSignalFlags.NONE,
        () => refreshSessionLocked(bus, sessionPath),
      )
      refreshSessionLocked(bus, sessionPath)
      const suspend = yield* queryCapability(bus, "CanSuspend")
      const reboot = yield* queryCapability(bus, "CanReboot")
      const powerOff = yield* queryCapability(bus, "CanPowerOff")
      publish({
        ...state,
        session: {
          ...state.session,
          lock: sessionId !== null,
          suspend,
          reboot,
          powerOff,
          logOut: sessionController?.snapshot().logOut ?? false,
          switchUser: sessionController?.snapshot().switchUser ?? false,
        },
      })
    }).pipe(
      Effect.catchTag("QuickSettingsActionError", (error) =>
        Effect.sync(() => {
          diagnosticLog("quick-settings.logind.unavailable", {
            operation: error.operation,
            error: String(error.cause),
          })
        }),
      ),
    ),
  )

  return {
    snapshot: () => state,
    subscribe: (listener) => {
      if (stopped) return () => {}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispatch,
    stop: () => {
      if (stopped) return
      stopped = true
      if (backlightTimer !== 0) {
        GLib.source_remove(backlightTimer)
        backlightTimer = 0
      }
      if (systemBus !== null && logindSubscription !== 0) {
        systemBus.signal_unsubscribe(logindSubscription)
        logindSubscription = 0
      }
      if (autoRotateController !== null) {
        runCleanups("auto-rotate", [autoRotateController.stop])
        autoRotateController = null
      }
      cancellable.cancel()
      runCleanups("wifi-signals", wifiDisconnectors)
      runCleanups("speaker-signals", speakerDisconnectors)
      runCleanups("audio-output-signals", outputDisconnectors)
      runCleanups("bluetooth-device-signals", bluetoothDeviceDisconnectors)
      runCleanups("service-signals", disconnectors)
      if (sessionController !== null)
        runCleanups("accounts-service-signals", [sessionController.stop])
      listeners.clear()
    },
  }
}

export function createQuickSettingsModule(
  fixtureMode: boolean,
  niriSocketPath: string | null = GLib.getenv("NIRI_SOCKET"),
): QuickSettingsModule {
  return fixtureMode
    ? createFixtureQuickSettingsModule(fixtureProfile(GLib.getenv("YATES_FIXTURE_PROFILE")))
    : createLiveQuickSettingsModule(niriSocketPath)
}
