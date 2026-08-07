import GLib from "gi://GLib"

import { Accessor, createState } from "gnim"

import { createNiriStateSource, NiriStateSource } from "../niri/source"
import { createQuickSettingsModule } from "./quickSettings"
import { QuickSettingsModule } from "./quickSettingsModel"

export interface BarServices {
  readonly niri: NiriStateSource
  readonly now: Accessor<Date>
  readonly systemIndicators: boolean
  readonly quickSettings: QuickSettingsModule
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
  const quickSettings = createQuickSettingsModule(fixtureMode)

  return {
    niri,
    now,
    systemIndicators: !fixtureMode,
    quickSettings,
    stop: () => {
      if (timer !== 0) GLib.source_remove(timer)
      niri.stop()
      quickSettings.stop()
    },
  }
}
