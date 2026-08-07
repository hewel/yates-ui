import type { SystemSettingsPanel } from "../../services/systemSettings"

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

export interface SubmenuSettingsTarget {
  readonly label: string
  readonly panel: SystemSettingsPanel
}

export function submenuSettingsTarget(detail: QuickSettingsDetail): SubmenuSettingsTarget | null {
  switch (detail) {
    case "wifi":
      return { label: "All Networks", panel: "wifi" }
    case "wired":
    case "vpn":
      return { label: "Network Settings", panel: "network" }
    case "mobile":
    case "bluetooth-tether":
    case "bluetooth":
      return { label: "Bluetooth Settings", panel: "bluetooth" }
    case "audio":
      return { label: "Sound Settings", panel: "sound" }
    case "background-apps":
      return { label: "App Settings", panel: "applications" }
    case "power-profile":
    case "orientation":
    case "session-confirmation":
      return null
  }
}
