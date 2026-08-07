import GLib from "gi://GLib"

import { Accessor, createState } from "gnim"

import { createNiriStateSource, NiriStateSource } from "../niri/source"

export interface BarServices {
  readonly niri: NiriStateSource
  readonly now: Accessor<Date>
  readonly systemIndicators: boolean
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

  return {
    niri,
    now,
    systemIndicators: !fixtureMode,
    stop: () => {
      if (timer !== 0) GLib.source_remove(timer)
      niri.stop()
    },
  }
}
