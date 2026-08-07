import { describe, expect, test } from "bun:test"

import {
  createFixtureQuickSettingsModule,
  fixtureQuickSettingsState,
} from "../src/services/quickSettingsModel"

describe("quick settings fixture model", () => {
  test("projects the deterministic laptop capabilities used by nested acceptance", () => {
    const state = fixtureQuickSettingsState()

    expect(state.battery.available).toBe(true)
    expect(state.audio.volume).toBe(0.64)
    expect(state.wifi.activeNetworkName).toBe("Office")
    expect(state.bluetooth.devices.filter((device) => device.connected)).toHaveLength(1)
    expect(state.powerMode.activeProfile).toBe("balanced")
  })

  test("clamps volume and switches enum-like selections", () => {
    const module = createFixtureQuickSettingsModule()
    module.dispatch({
      type: "set-volume",
      value: 4,
    })
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
    expect(state.audio.activeOutputId).toBe("headphones")
    expect(state.powerMode.activeProfile).toBe("power-saver")
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
    module.dispatch({ type: "toggle-wifi" })
    module.dispatch({ type: "connect-wifi", id: "guest" })

    expect(module.snapshot().audio.activeOutputId).toBe(initial.audio.activeOutputId)
    expect(module.snapshot().powerMode.activeProfile).toBe(initial.powerMode.activeProfile)
    expect(module.snapshot().wifi.activeNetworkId).toBeNull()
  })

  test("ignores a non-finite volume", () => {
    const module = createFixtureQuickSettingsModule()
    module.dispatch({ type: "set-volume", value: Number.NaN })

    expect(module.snapshot().audio.volume).toBe(0.64)
  })
})
