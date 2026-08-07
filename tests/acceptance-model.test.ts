import { describe, expect, test } from "bun:test"

import {
  assertOneBarPerOutput,
  classifyIsolatedSessionExit,
  decodeGdbusString,
  exitCodes,
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
})
