import { describe, expect, test } from "bun:test"
import { Either, Schema } from "effect"

import {
  DebugSnapshot,
  assertFixtureProfileCapabilities,
  assertOneBarPerOutput,
  classifyIsolatedSessionExit,
  decodeGdbusString,
  exitCodes,
  fixtureProfiles,
  isFixtureProfile,
  makeResult,
  preflightEnvironment,
  waylandDisplayFromNiriSocket,
} from "../scripts/acceptance/model"

const requiredTools = {
  bun: "/usr/bin/bun",
  dbusRunSession: "/usr/bin/dbus-run-session",
  gdbus: "/usr/bin/gdbus",
  gjs: "/usr/bin/gjs",
  niri: "/usr/bin/niri",
  zenity: "/usr/bin/zenity",
  grim: null,
  magick: null,
}

describe("nested acceptance contract", () => {
  test("classifies missing nested-compositor prerequisites as environment evidence", () => {
    const result = preflightEnvironment({
      tools: { ...requiredTools, niri: null },
      waylandDisplay: undefined,
      xdgRuntimeDir: "/run/user/1000",
      insideSession: false,
      dbusSessionBusAddress: undefined,
    })

    expect(result.ok).toBe(false)
    expect(result.failures).toEqual(["required tool not found: niri", "WAYLAND_DISPLAY is not set"])
    expect(result.optionalUnavailable).toEqual(["grim", "magick"])
    expect(makeResult("run", "/tmp/run", "environment", "unavailable").exitCode).toBe(
      exitCodes.environment,
    )
  })

  test("requires exactly one yates-bar layer for every isolated output", () => {
    const layer = (output: string) => ({
      namespace: "yates-bar",
      output,
      layer: "Top",
      keyboard_interactivity: "None",
    })

    expect(assertOneBarPerOutput(["winit"], [layer("winit")]).ok).toBe(true)
    const duplicate = assertOneBarPerOutput(["winit"], [layer("winit"), layer("winit")])
    expect(duplicate.ok).toBe(false)
    expect(duplicate.detail).toContain('"winit":2')
  })

  test("decodes the single string returned by gdbus", () => {
    expect(decodeGdbusString(`('{"ok":true}',)\n`)).toBe('{"ok":true}')
    expect(decodeGdbusString("not a tuple")).toBeNull()
  })

  test("classifies an outer dbus-run-session startup failure as environment", () => {
    expect(classifyIsolatedSessionExit(127)).toBe("environment")
    expect(classifyIsolatedSessionExit(exitCodes.harness)).toBe("harness")
    expect(classifyIsolatedSessionExit(exitCodes.assertion)).toBe("assertion")
    expect(classifyIsolatedSessionExit(exitCodes.cleanup)).toBe("cleanup")
  })

  test("derives the nested Wayland display without leaking Niri's pid suffix", () => {
    expect(waylandDisplayFromNiriSocket("/run/user/1000/niri.wayland-2.404117.sock")).toBe(
      "wayland-2",
    )
    expect(waylandDisplayFromNiriSocket("niri.invalid.sock")).toBeNull()
  })

  test("recognizes every deterministic quick settings fixture profile", () => {
    expect(fixtureProfiles).toEqual([
      "laptop",
      "desktop",
      "complex",
      "lockscreen-laptop",
      "lockscreen-desktop",
      "empty-states",
    ])
    for (const profile of fixtureProfiles) expect(isFixtureProfile(profile)).toBe(true)
    expect(isFixtureProfile("production" as string)).toBe(false)
  })

  test("detects fixture profile capability drift", () => {
    expect(
      assertFixtureProfileCapabilities("desktop", ["nightLight", "wired", "darkMode", "powerMode"])
        .ok,
    ).toBe(true)
    const drift = assertFixtureProfileCapabilities("desktop", ["wifi", "powerMode"])
    expect(drift.ok).toBe(false)
    expect(drift.detail).toContain("actual=powerMode,wifi")
  })

  test("decodes the canonical inline-detail debug snapshot", () => {
    const decoded = Schema.decodeUnknownEither(DebugSnapshot)({
      version: 1,
      ready: true,
      pid: 123,
      activationCount: 1,
      settings: { visible: false, barOrientation: "vertical" },
      quickSettings: {
        fixtureProfile: "laptop",
        availableCapabilities: ["wifi"],
        volume: 0.5,
        wifiEnabled: true,
        bluetoothEnabled: true,
        powerProfile: "balanced",
        darkMode: false,
        nightLight: false,
        locked: false,
        pending: null,
        error: null,
      },
      niri: {
        connected: true,
        sequence: 1,
        workspaceIds: [1],
        windowIds: [],
        focusedWorkspaceId: 1,
        focusedWindowId: null,
      },
      outputs: [
        {
          connector: "winit",
          orientation: "vertical",
          barVisible: true,
          popupVisible: false,
          popupWorkspaceId: null,
          quickSettingsVisible: true,
          quickSettingsDetail: "wifi",
          hideScheduled: false,
        },
      ],
    })

    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.outputs[0]?.quickSettingsDetail).toBe("wifi")
    }
  })
})
