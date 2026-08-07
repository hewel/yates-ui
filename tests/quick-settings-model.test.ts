import { describe, expect, test } from "bun:test"

import {
  createFixtureQuickSettingsModule,
  fixtureQuickSettingsState,
} from "../src/services/quickSettingsModel"

describe("quick settings fixture model", () => {
  test("projects the deterministic laptop capabilities used by nested acceptance", () => {
    const state = fixtureQuickSettingsState()

    expect(state.battery.available).toBe(true)
    expect(state.brightness.available).toBe(true)
    expect(state.audio.volume).toBe(0.64)
    expect(state.wifi.activeNetworkName).toBe("Office")
    expect(state.bluetooth.devices.filter((device) => device.connected)).toHaveLength(1)
    expect(state.powerMode.activeProfile).toBe("balanced")
    expect(state.backgroundApps.apps).toHaveLength(3)
    expect(state.pending).toBeNull()
    expect(state.error).toBeNull()
  })

  test("provides the six explicit fixture profiles", () => {
    const laptop = fixtureQuickSettingsState("laptop")
    const desktop = fixtureQuickSettingsState("desktop")
    const complex = fixtureQuickSettingsState("complex")
    const lockscreenLaptop = fixtureQuickSettingsState("lockscreen-laptop")
    const lockscreenDesktop = fixtureQuickSettingsState("lockscreen-desktop")
    const empty = fixtureQuickSettingsState("empty-states")

    expect(laptop.wifi.available).toBe(true)
    expect(desktop.wired.activeConnectionId).toBe("wired-1")
    expect(desktop.wifi.available).toBe(false)
    expect(lockscreenLaptop.session.locked).toBe(true)
    expect(lockscreenDesktop.session.locked).toBe(true)
    expect(empty.bluetooth.devices).toEqual([])
    expect(empty.vpn.available).toBe(true)
    expect(empty.vpn.connections).toEqual([])

    const designToggleAvailability = [
      complex.wired.available,
      complex.wifi.available,
      complex.mobile.available,
      complex.bluetoothTether.available,
      complex.vpn.available,
      complex.bluetooth.available,
      complex.powerMode.available,
      complex.nightLight.available,
      complex.darkMode.available,
      complex.airplaneMode.available,
      complex.autoRotate.available,
    ]
    expect(designToggleAvailability).toEqual(Array.from({ length: 11 }, () => true))
  })

  test("makes every design submenu state reachable without UI-only fixture data", () => {
    const complex = fixtureQuickSettingsState("complex")
    const empty = fixtureQuickSettingsState("empty-states")
    const bluetoothOff = createFixtureQuickSettingsModule("laptop")
    bluetoothOff.dispatch({ type: "toggle-bluetooth" })

    const submenuStates = [
      complex.session.powerOff,
      complex.mobile.connections.length > 0,
      complex.bluetooth.devices.length > 0,
      empty.bluetooth.devices.length === 0,
      bluetoothOff.snapshot().bluetooth.enabled === false,
      complex.bluetoothTether.connections.length > 0,
      complex.backgroundApps.apps.length > 0,
      complex.audio.outputs.length > 1,
      complex.wired.connections.length > 0,
      complex.vpn.connections.length > 0,
      empty.vpn.connections.length === 0,
      complex.wifi.networks.length >= 8,
      complex.powerMode.profiles.length === 3,
    ]

    expect(submenuStates).toEqual(Array.from({ length: 13 }, () => true))
  })

  test("clamps volume and switches enum-like selections", () => {
    const module = createFixtureQuickSettingsModule()
    module.dispatch({
      type: "set-volume",
      value: 4,
    })
    module.dispatch({ type: "set-brightness", value: -2 })
    module.dispatch({ type: "toggle-mute" })
    module.dispatch({
      type: "select-audio-output",
      id: "headphones",
    })
    module.dispatch({
      type: "set-power-profile",
      id: "power-saver",
    })
    const state = module.snapshot()

    expect(state.audio.volume).toBe(1)
    expect(state.audio.muted).toBe(true)
    expect(state.brightness.value).toBe(0)
    expect(state.audio.activeOutputId).toBe("headphones")
    expect(state.powerMode.activeProfile).toBe("power-saver")
  })

  test("connects every design connection family by stable id", () => {
    const module = createFixtureQuickSettingsModule("complex")

    module.dispatch({ type: "toggle-wired-connection", id: "wired-dock" })
    module.dispatch({ type: "toggle-vpn", id: "server-2345" })
    module.dispatch({ type: "toggle-mobile-connection", id: "carrier-backup" })
    module.dispatch({ type: "toggle-bluetooth-tether", id: "phone-abc" })

    const state = module.snapshot()
    expect(state.wired.activeConnectionId).toBe("wired-dock")
    expect(state.wired.connections.filter((connection) => connection.connected)).toHaveLength(1)
    expect(state.vpn.activeConnectionIds).toContain("server-2345")
    expect(state.mobile.activeConnectionIds).toContain("carrier-backup")
    expect(state.bluetoothTether.activeConnectionIds).toEqual(["phone-abc"])
  })

  test("restores radio enablement after airplane mode and clears it on manual radio enable", () => {
    const module = createFixtureQuickSettingsModule("complex")

    module.dispatch({ type: "set-airplane-mode", enabled: true })
    expect(module.snapshot().airplaneMode.enabled).toBe(true)
    expect(module.snapshot().wifi.enabled).toBe(false)
    expect(module.snapshot().bluetooth.enabled).toBe(false)
    expect(module.snapshot().mobile.enabled).toBe(false)

    module.dispatch({ type: "set-airplane-mode", enabled: false })
    expect(module.snapshot().wifi.enabled).toBe(true)
    expect(module.snapshot().bluetooth.enabled).toBe(true)
    expect(module.snapshot().mobile.enabled).toBe(true)

    module.dispatch({ type: "set-airplane-mode", enabled: true })
    module.dispatch({ type: "toggle-wifi" })
    expect(module.snapshot().airplaneMode.enabled).toBe(false)
    expect(module.snapshot().wifi.enabled).toBe(true)
  })

  test("represents and controls background, recording, cast, rotate, and session details", () => {
    const module = createFixtureQuickSettingsModule("complex")

    module.dispatch({ type: "stop-background-app", id: "telegram" })
    module.dispatch({ type: "stop-screen-recording" })
    module.dispatch({ type: "stop-cast", id: "cast-1" })
    module.dispatch({ type: "stop-cast", id: "external-cast" })
    module.dispatch({ type: "set-auto-rotate", enabled: false })
    module.dispatch({ type: "session", action: "switch-user" })

    const state = module.snapshot()
    expect(state.backgroundApps.apps.map((app) => app.id)).not.toContain("telegram")
    expect(state.privacy.screenRecording.active).toBe(false)
    expect(state.privacy.casts.map((cast) => cast.id)).toEqual(["external-cast"])
    expect(state.autoRotate.enabled).toBe(false)
    expect(state.session.locked).toBe(true)
  })

  test("toggles radios and connects list rows through one action seam", () => {
    const module = createFixtureQuickSettingsModule()
    module.dispatch({ type: "toggle-bluetooth" })
    module.dispatch({
      type: "toggle-bluetooth-device",
      id: "mouse",
    })
    module.dispatch({ type: "toggle-bluetooth" })
    module.dispatch({
      type: "toggle-bluetooth-device",
      id: "mouse",
    })
    module.dispatch({
      type: "connect-wifi",
      id: "guest",
    })
    const state = module.snapshot()

    expect(state.bluetooth.enabled).toBe(true)
    expect(state.bluetooth.devices.find((device) => device.id === "mouse")?.connected).toBe(true)
    expect(state.wifi.activeNetworkName).toBe("Guest Network")
  })

  test("notifies through the public interface and stops idempotently", () => {
    const module = createFixtureQuickSettingsModule()
    const volumes: number[] = []
    const unsubscribe = module.subscribe((state) => volumes.push(state.audio.volume))

    module.dispatch({ type: "set-volume", value: 0.25 })
    unsubscribe()
    module.dispatch({ type: "set-volume", value: 0.5 })
    module.stop()
    module.stop()
    module.dispatch({ type: "set-volume", value: 0.75 })

    expect(volumes).toEqual([0.25])
    expect(module.snapshot().audio.volume).toBe(0.5)
  })

  test("ignores unknown selections and unavailable radio actions", () => {
    const module = createFixtureQuickSettingsModule()
    const initial = module.snapshot()

    module.dispatch({ type: "select-audio-output", id: "missing" })
    module.dispatch({ type: "set-power-profile", id: "missing" })
    module.dispatch({ type: "toggle-wired-connection", id: "missing" })
    module.dispatch({ type: "toggle-vpn", id: "missing" })
    module.dispatch({ type: "stop-background-app", id: "missing" })
    module.dispatch({ type: "stop-cast", id: "missing" })
    module.dispatch({ type: "toggle-wifi" })
    module.dispatch({ type: "connect-wifi", id: "guest" })

    expect(module.snapshot().audio.activeOutputId).toBe(initial.audio.activeOutputId)
    expect(module.snapshot().powerMode.activeProfile).toBe(initial.powerMode.activeProfile)
    expect(module.snapshot().wifi.activeNetworkId).toBeNull()
    expect(module.snapshot().wired).toEqual(initial.wired)
    expect(module.snapshot().vpn).toEqual(initial.vpn)
    expect(module.snapshot().backgroundApps).toEqual(initial.backgroundApps)
    expect(module.snapshot().privacy).toEqual(initial.privacy)
  })

  test("does not publish when an action is invalid for the active profile", () => {
    const module = createFixtureQuickSettingsModule("desktop")
    let notifications = 0
    module.subscribe(() => notifications++)
    const initial = module.snapshot()

    module.dispatch({ type: "toggle-wifi" })
    module.dispatch({ type: "set-brightness", value: 0.4 })
    module.dispatch({ type: "toggle-bluetooth-device", id: "missing" })
    module.dispatch({ type: "set-auto-rotate", enabled: true })

    expect(module.snapshot()).toBe(initial)
    expect(notifications).toBe(0)
  })

  test("ignores a non-finite volume", () => {
    const module = createFixtureQuickSettingsModule()
    module.dispatch({ type: "set-volume", value: Number.NaN })
    module.dispatch({ type: "set-brightness", value: Number.POSITIVE_INFINITY })

    expect(module.snapshot().audio.volume).toBe(0.64)
    expect(module.snapshot().brightness.value).toBe(0.72)
  })
})
