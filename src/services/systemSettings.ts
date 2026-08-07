import Gio from "gi://Gio"
import GLib from "gi://GLib"

import { Effect, Schema } from "effect"

import { diagnosticLog } from "../debug/log"

export type SystemSettingsPanel = "applications" | "bluetooth" | "network" | "sound" | "wifi"

export interface SystemSettingsLauncher {
  readonly available: boolean
  open(panel: SystemSettingsPanel): void
}

class SystemSettingsLaunchError extends Schema.TaggedError<SystemSettingsLaunchError>()(
  "SystemSettingsLaunchError",
  {
    panel: Schema.String,
    cause: Schema.Defect,
  },
) {}

const launchSystemSettings = Effect.fn("SystemSettings.launch")(function* (
  executable: string,
  panel: SystemSettingsPanel,
) {
  return yield* Effect.try({
    try: () => Gio.Subprocess.new([executable, panel], Gio.SubprocessFlags.NONE),
    catch: (cause) => SystemSettingsLaunchError.make({ panel, cause }),
  })
})

export function createSystemSettingsLauncher(): SystemSettingsLauncher {
  const executable = GLib.find_program_in_path("gnome-control-center")

  return {
    available: executable !== null,
    open: (panel) => {
      if (executable === null) return
      Effect.runSync(
        launchSystemSettings(executable, panel).pipe(
          Effect.match({
            onFailure: (error) => {
              diagnosticLog("system-settings.launch.failed", { panel: error.panel })
            },
            onSuccess: () => undefined,
          }),
        ),
      )
    },
  }
}
