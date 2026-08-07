import Gio from "gi://Gio"
import GLib from "gi://GLib"

const backlightRoot = "/sys/class/backlight"

interface BacklightDevice {
  readonly name: string
  readonly maximum: number
  readonly current: number
}

export interface BacklightSnapshot {
  readonly available: boolean
  readonly value: number
  readonly deviceName: string | null
}

function readInteger(path: string): number | null {
  try {
    const [ok, bytes] = GLib.file_get_contents(path)
    if (!ok) return null
    const value = Number.parseInt(new TextDecoder().decode(bytes).trim(), 10)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function backlightNames(): ReadonlyArray<string> {
  try {
    const root = Gio.File.new_for_path(backlightRoot)
    const enumerator = root.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null)
    const names: Array<string> = []
    try {
      let info = enumerator.next_file(null)
      while (info !== null) {
        names.push(info.get_name())
        info = enumerator.next_file(null)
      }
    } finally {
      enumerator.close(null)
    }
    return names.sort((left, right) => left.localeCompare(right))
  } catch {
    return []
  }
}

function readDevice(name: string): BacklightDevice | null {
  const directory = GLib.build_filenamev([backlightRoot, name])
  const maximum = readInteger(GLib.build_filenamev([directory, "max_brightness"]))
  const actual = readInteger(GLib.build_filenamev([directory, "actual_brightness"]))
  const configured = readInteger(GLib.build_filenamev([directory, "brightness"]))
  const current = actual ?? configured
  if (maximum === null || maximum <= 0 || current === null || current < 0) return null
  return { name, maximum, current: Math.min(current, maximum) }
}

export function readBacklightSnapshot(): BacklightSnapshot {
  for (const name of backlightNames()) {
    const device = readDevice(name)
    if (device === null) continue
    return {
      available: true,
      value: device.current / device.maximum,
      deviceName: device.name,
    }
  }
  return { available: false, value: 0, deviceName: null }
}

export async function setBacklight(
  bus: Gio.DBusConnection,
  value: number,
  cancellable: Gio.Cancellable,
): Promise<void> {
  if (!Number.isFinite(value)) throw new Error("brightness value must be finite")
  const snapshot = readBacklightSnapshot()
  if (!snapshot.available || snapshot.deviceName === null) {
    throw new Error("backlight is unavailable")
  }
  const maximum = readInteger(
    GLib.build_filenamev([backlightRoot, snapshot.deviceName, "max_brightness"]),
  )
  if (maximum === null || maximum <= 0) throw new Error("backlight maximum is unavailable")
  const raw = Math.max(1, Math.min(maximum, Math.round(Math.max(0, Math.min(1, value)) * maximum)))

  await bus.call(
    "org.freedesktop.login1",
    "/org/freedesktop/login1/session/auto",
    "org.freedesktop.login1.Session",
    "SetBrightness",
    new GLib.Variant("(ssu)", ["backlight", snapshot.deviceName, raw]),
    null,
    Gio.DBusCallFlags.NONE,
    -1,
    cancellable,
  )
}
