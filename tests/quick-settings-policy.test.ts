import { describe, expect, test } from "bun:test"

import { submenuSettingsTarget } from "../src/widget/bar/quickSettingsPolicy"

describe("quick settings submenu policy", () => {
  test("only exposes a settings destination for partial system submenus", () => {
    expect(submenuSettingsTarget("wifi")).toEqual({ label: "All Networks", panel: "wifi" })
    expect(submenuSettingsTarget("wired")).toEqual({
      label: "Network Settings",
      panel: "network",
    })
    expect(submenuSettingsTarget("vpn")).toEqual({
      label: "Network Settings",
      panel: "network",
    })
    expect(submenuSettingsTarget("mobile")).toEqual({
      label: "Bluetooth Settings",
      panel: "bluetooth",
    })
    expect(submenuSettingsTarget("bluetooth-tether")).toEqual({
      label: "Bluetooth Settings",
      panel: "bluetooth",
    })
    expect(submenuSettingsTarget("bluetooth")).toEqual({
      label: "Bluetooth Settings",
      panel: "bluetooth",
    })
    expect(submenuSettingsTarget("audio")).toEqual({
      label: "Sound Settings",
      panel: "sound",
    })
    expect(submenuSettingsTarget("background-apps")).toEqual({
      label: "App Settings",
      panel: "applications",
    })
    expect(submenuSettingsTarget("power-profile")).toBeNull()
    expect(submenuSettingsTarget("orientation")).toBeNull()
    expect(submenuSettingsTarget("session-confirmation")).toBeNull()
  })

  test("keeps inline revealers mounted and animates reveal-child changes", async () => {
    const source = await Bun.file(
      new URL("../src/widget/bar/QuickSettings.tsx", import.meta.url),
    ).text()

    expect(source).toContain("revealChild={selected}")
    expect(source).not.toContain("visible={selected}")
    expect(source).not.toContain("revealChild={true}")
  })
})
