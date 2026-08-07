import Gio from "gi://Gio"
import GLib from "gi://GLib"

import { Accessor, createSettings } from "gnim"

import { BarOrientation, normalizeBarOrientation } from "./appSettingsModel"

const SETTINGS_SCHEMA_ID = "me.pigmint.yates-ui"
const SETTINGS_SCHEMA_DIRECTORY = `${decodeURIComponent(
  import.meta.url.slice("file://".length, import.meta.url.lastIndexOf("/") + 1),
)}schemas`

export interface AppSettings {
  readonly barOrientation: Accessor<BarOrientation>
  setBarOrientation(orientation: BarOrientation): void
  flush(): void
}

function loadSettingsSchema(): Gio.SettingsSchema {
  const defaultSource = Gio.SettingsSchemaSource.get_default()
  const compiledSchema = `${SETTINGS_SCHEMA_DIRECTORY}/gschemas.compiled`
  const source = GLib.file_test(compiledSchema, GLib.FileTest.EXISTS)
    ? Gio.SettingsSchemaSource.new_from_directory(SETTINGS_SCHEMA_DIRECTORY, defaultSource, false)
    : defaultSource
  const schema = source?.lookup(SETTINGS_SCHEMA_ID, true)
  if (!schema) {
    throw new Error(
      `GSettings schema ${SETTINGS_SCHEMA_ID} is unavailable; run bun run build before starting Yates UI`,
    )
  }
  return schema
}

export function createAppSettings(): AppSettings {
  const gioSettings = Gio.Settings.new_full(loadSettingsSchema(), null, null)
  const settings = createSettings(gioSettings, { "bar-orientation": "s" })

  return {
    barOrientation: settings.barOrientation.as(normalizeBarOrientation),
    setBarOrientation: (orientation) => settings.setBarOrientation(orientation),
    flush: () => Gio.Settings.sync(),
  }
}
