import GLib from "gi://GLib"

import { Accessor, createState } from "gnim"

import { createNiriStateSource, NiriStateSource } from "../niri/source"
import { createPrivacyStatusModule } from "./privacyStatus"
import { PrivacyStatusModule } from "./privacyStatusModel"
import { createQuickSettingsModule } from "./quickSettings"
import { QuickSettingsModule } from "./quickSettingsModel"

export interface BarServices {
  readonly niri: NiriStateSource
  readonly now: Accessor<Date>
  readonly systemIndicators: boolean
  readonly quickSettings: QuickSettingsModule
  readonly privacyStatus: PrivacyStatusModule
  stop(): void
}

export function createBarServices(): BarServices {
  const fixtureMode = GLib.getenv("YATES_FIXTURE_MODE") === "1"
  const [now, setNow] = createState(fixtureMode ? new Date("2026-01-02T03:04:00Z") : new Date())
  const timer = fixtureMode
    ? 0
    : GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
        setNow(new Date())
        return GLib.SOURCE_CONTINUE
      })
  const niri = createNiriStateSource()
  const quickSettings = createQuickSettingsModule(fixtureMode, niri.socketPath)
  const privacyStatus = createPrivacyStatusModule({
    fixtureMode,
    fixtureProfile: GLib.getenv("YATES_FIXTURE_PROFILE") ?? "laptop",
    niri,
  })

  return {
    niri,
    now,
    systemIndicators: !fixtureMode,
    quickSettings,
    privacyStatus,
    stop: () => {
      if (timer !== 0) GLib.source_remove(timer)
      privacyStatus.stop()
      quickSettings.stop()
      niri.stop()
    },
  }
}
