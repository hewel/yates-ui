import Battery from "gi://AstalBattery"
import Bluetooth from "gi://AstalBluetooth"
import Network from "gi://AstalNetwork"
import PowerProfiles from "gi://AstalPowerProfiles"
import Wp from "gi://AstalWp"
import Gio from "gi://Gio"
import GLib from "gi://GLib"

import { Effect, Schema } from "effect"

import { diagnosticLog } from "../debug/log"
import {
  QuickSettingsAction,
  QuickSettingsModule,
  QuickSettingsState,
  SessionAction,
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
      connected: false,
      iconName: "network-wired-disconnected-symbolic",
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
    session: {
      screenshot: false,
      lock: false,
      suspend: false,
      reboot: false,
      powerOff: false,
    },
    pendingAction: null,
    errorMessage: null,
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

function canLogindAction(answer: string): boolean {
  return answer === "yes" || answer === "challenge"
}

function createLiveQuickSettingsModule(): QuickSettingsModule {
  const battery = Battery.Device.get_default()
  const network = Network.get_default()
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
  let stopped = false
  let state = unavailableState()
  const listeners = new Set<(next: QuickSettingsState) => void>()
  const disconnectors: Array<() => void> = []
  let wifiDisconnectors: Array<() => void> = []
  let speakerDisconnectors: Array<() => void> = []
  let outputDisconnectors: Array<() => void> = []
  let bluetoothDeviceDisconnectors: Array<() => void> = []

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
      .sort((left, right) => right.strength - left.strength)
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
      }))
    const speaker = audio.defaultSpeaker
    const outputs = (audio.get_speakers() ?? []).map((output) => ({
      id: String(output.id),
      name: output.description ?? output.name ?? "Audio Output",
      iconName: output.icon || "audio-speakers-symbolic",
    }))
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

    return {
      battery: {
        available: Boolean(battery?.isPresent && battery.isBattery && battery.powerSupply),
        percentage: battery?.percentage ?? 0,
        iconName: battery?.batteryIconName ?? "battery-missing-symbolic",
        charging: battery?.charging ?? false,
      },
      audio: {
        available: Boolean(wp.connected && speaker),
        volume: speaker?.volume ?? 0,
        muted: speaker?.mute ?? false,
        iconName: speaker?.volumeIcon ?? "audio-volume-muted-symbolic",
        activeOutputId: speaker ? String(speaker.id) : null,
        outputs,
      },
      wifi: {
        available: wifi !== null,
        enabled: wifi?.enabled ?? false,
        activeNetworkId: activeAccessPoint?.bssid ?? null,
        activeNetworkName: activeAccessPoint?.ssid ?? null,
        iconName: wifi?.iconName ?? "network-wireless-offline-symbolic",
        scanning: wifi?.scanning ?? false,
        networks: wifiNetworks,
      },
      wired: {
        available: network.wired !== null,
        connected: network.primary === Network.Primary.WIRED,
        iconName: network.wired?.iconName ?? "network-wired-disconnected-symbolic",
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
      session: state.session,
      pendingAction: state.pendingAction,
      errorMessage: state.errorMessage,
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
    for (const disconnect of wifiDisconnectors) disconnect()
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
    for (const disconnect of speakerDisconnectors) disconnect()
    for (const disconnect of outputDisconnectors) disconnect()
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
    for (const disconnect of bluetoothDeviceDisconnectors) disconnect()
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
    operation: string,
    effect: Effect.Effect<void, QuickSettingsActionError>,
  ): void => {
    if (stopped || state.pendingAction !== null) return
    publish({ ...state, pendingAction: operation, errorMessage: null })
    void Effect.runPromise(
      effect.pipe(
        Effect.match({
          onFailure: (error) => {
            diagnosticLog("quick-settings.action.failed", {
              operation: error.operation,
              error: String(error.cause),
            })
            publish({
              ...state,
              pendingAction: null,
              errorMessage: `${error.operation} failed: ${String(error.cause)}`,
            })
          },
          onSuccess: () => {
            refresh()
            publish({ ...state, pendingAction: null, errorMessage: null })
          },
        }),
      ),
    )
  }

  const syncAction = (operation: string, perform: () => void): void => {
    if (stopped) return
    publish({ ...state, pendingAction: operation, errorMessage: null })
    Effect.runSync(
      Effect.try({
        try: perform,
        catch: actionError(operation),
      }).pipe(
        Effect.match({
          onFailure: (error) => {
            diagnosticLog("quick-settings.action.failed", {
              operation: error.operation,
              error: String(error.cause),
            })
            publish({
              ...state,
              pendingAction: null,
              errorMessage: `${error.operation} failed: ${String(error.cause)}`,
            })
          },
          onSuccess: () => {
            refresh()
            publish({ ...state, pendingAction: null, errorMessage: null })
          },
        }),
      ),
    )
  }

  const promiseAction = (operation: string, perform: () => Promise<unknown>): void =>
    runAction(
      operation,
      Effect.tryPromise({
        try: () => perform().then(() => undefined),
        catch: actionError(operation),
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

  const dispatchSession = (action: SessionAction): void => {
    const available =
      action === "power-off"
        ? state.session.powerOff
        : action === "reboot"
          ? state.session.reboot
          : state.session.suspend
    if (!available) return
    const method = action === "power-off" ? "PowerOff" : action === "reboot" ? "Reboot" : "Suspend"
    promiseAction(action, () => callLogind(method, new GLib.Variant("(b)", [true])))
  }

  const dispatch = (action: QuickSettingsAction): void => {
    switch (action.type) {
      case "set-volume": {
        const speaker = audio.defaultSpeaker
        if (!speaker) return
        syncAction(action.type, () => speaker.set_volume(Math.max(0, Math.min(1, action.value))))
        return
      }
      case "select-audio-output": {
        const output = (audio.get_speakers() ?? []).find(
          (candidate) => String(candidate.id) === action.id,
        )
        if (!output) return
        syncAction(action.type, () => output.set_is_default(true))
        return
      }
      case "toggle-wifi": {
        const wifi = network.wifi
        if (!wifi) return
        syncAction(action.type, () => wifi.set_enabled(!wifi.enabled))
        return
      }
      case "scan-wifi": {
        const wifi = network.wifi
        if (!wifi || !wifi.enabled) return
        syncAction(action.type, () => wifi.scan())
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
            errorMessage: "Open Network Settings to connect to a new secured network",
          })
          return
        }
        promiseAction(action.type, () => accessPoint.activate(null))
        return
      }
      case "toggle-bluetooth": {
        const adapter = bluetooth.adapter
        if (!adapter) return
        syncAction(action.type, () => adapter.set_powered(!adapter.powered))
        return
      }
      case "toggle-bluetooth-device": {
        const device = bluetooth.devices.find((candidate) => candidate.address === action.id)
        if (!device || !bluetooth.isPowered || !device.paired) return
        promiseAction(action.type, () =>
          device.connected ? device.disconnect_device() : device.connect_device(),
        )
        return
      }
      case "set-power-profile":
        if (!powerProfiles.get_profiles().some((profile) => profile.profile === action.id)) return
        syncAction(action.type, () => powerProfiles.set_active_profile(action.id))
        return
      case "set-dark-mode":
        if (!appearance?.is_writable("color-scheme")) return
        syncAction(action.type, () => {
          if (!appearance.set_string("color-scheme", action.enabled ? "prefer-dark" : "default")) {
            throw new Error("color-scheme was not changed")
          }
        })
        return
      case "set-night-light":
        if (!color?.is_writable("night-light-enabled")) return
        syncAction(action.type, () => {
          if (!color.set_boolean("night-light-enabled", action.enabled)) {
            throw new Error("night-light-enabled was not changed")
          }
        })
        return
      case "take-screenshot": {
        if (!screenshotProgram) return
        const directory =
          GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES) ?? GLib.get_home_dir()
        const filename = `Screenshot-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.png`
        const path = GLib.build_filenamev([directory, filename])
        promiseAction(action.type, () => {
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
        promiseAction(action.type, () =>
          callLogind("LockSession", new GLib.Variant("(s)", [sessionId])),
        )
        return
      case "session":
        dispatchSession(action.action)
        return
      case "clear-error":
        publish({ ...state, errorMessage: null })
    }
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

  void Effect.runPromise(
    Effect.gen(function* () {
      const bus = yield* Effect.tryPromise({
        try: () => Gio.bus_get(Gio.BusType.SYSTEM, cancellable),
        catch: actionError("connect-logind"),
      })
      systemBus = bus
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
      cancellable.cancel()
      for (const disconnect of wifiDisconnectors) disconnect()
      for (const disconnect of speakerDisconnectors) disconnect()
      for (const disconnect of outputDisconnectors) disconnect()
      for (const disconnect of bluetoothDeviceDisconnectors) disconnect()
      for (const disconnect of disconnectors) disconnect()
      listeners.clear()
    },
  }
}

export function createQuickSettingsModule(fixtureMode: boolean): QuickSettingsModule {
  return fixtureMode ? createFixtureQuickSettingsModule() : createLiveQuickSettingsModule()
}
