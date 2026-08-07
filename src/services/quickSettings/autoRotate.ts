import Gio from "gi://Gio"
import GLib from "gi://GLib"

import {
  assertNiriRequestHandled,
  niriOutputNames,
  niriOutputTransformRequest,
  orientationTransform,
  uniqueInternalOutput,
} from "./autoRotateModel"

const sensorName = "net.hadess.SensorProxy"
const sensorPath = "/net/hadess/SensorProxy"
const sensorInterface = "net.hadess.SensorProxy"
const orientationSchema = "org.gnome.settings-daemon.peripherals.touchscreen"
const orientationLockKey = "orientation-lock"

export interface AutoRotateSnapshot {
  readonly available: boolean
  readonly enabled: boolean
}

export interface AutoRotateController {
  snapshot(): AutoRotateSnapshot
  setEnabled(enabled: boolean): Promise<void>
  stop(): void
}

function optionalOrientationSettings(): Gio.Settings | null {
  const schema = Gio.SettingsSchemaSource.get_default()?.lookup(orientationSchema, true)
  return schema ? Gio.Settings.new_full(schema, null, null) : null
}

function cachedBoolean(proxy: Gio.DBusProxy, name: string): boolean {
  return proxy.get_cached_property(name)?.get_boolean() ?? false
}

function cachedString(proxy: Gio.DBusProxy, name: string): string | null {
  return proxy.get_cached_property(name)?.get_string()[0] ?? null
}

function sendNiriRequest(
  socketPath: string,
  request: string,
  cancellable: Gio.Cancellable,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const client = new Gio.SocketClient()
    const address = new Gio.UnixSocketAddress({ path: socketPath })
    client.connect_async(address, cancellable, (source, result) => {
      let connection: Gio.SocketConnection | null = null
      try {
        connection = source?.connect_finish(result) ?? null
        if (!connection) throw new Error("Niri socket connection failed")
        const output = new Gio.DataOutputStream({ base_stream: connection.get_output_stream() })
        const input = new Gio.DataInputStream({ base_stream: connection.get_input_stream() })
        output.put_string(`${request}\n`, cancellable)
        input.read_line_async(GLib.PRIORITY_DEFAULT, cancellable, (stream, readResult) => {
          try {
            if (!stream) throw new Error("Niri reply stream closed")
            const [bytes] = stream.read_line_finish(readResult)
            if (bytes === null) throw new Error("Niri returned no reply")
            const line = new TextDecoder().decode(bytes)
            resolve(JSON.parse(line))
          } catch (cause) {
            reject(cause)
          } finally {
            try {
              connection?.close(null)
            } catch {
              // The request has already completed; shutdown errors are not actionable.
            }
          }
        })
      } catch (cause) {
        try {
          connection?.close(null)
        } catch {
          // Preserve the original connection error.
        }
        reject(cause)
      }
    })
  })
}

export async function createAutoRotateController(options: {
  readonly systemBus: Gio.DBusConnection
  readonly niriSocketPath: string | null
  readonly cancellable: Gio.Cancellable
  readonly onChanged: () => void
  readonly onBackgroundError: (cause: unknown) => void
}): Promise<AutoRotateController | null> {
  const { systemBus, niriSocketPath, cancellable, onChanged, onBackgroundError } = options
  if (!niriSocketPath) return null

  const settings = optionalOrientationSettings()
  if (!settings?.is_writable(orientationLockKey)) return null

  const proxy = Gio.DBusProxy.new_sync(
    systemBus,
    Gio.DBusProxyFlags.DO_NOT_AUTO_START,
    null,
    sensorName,
    sensorPath,
    sensorInterface,
    cancellable,
  )
  let output: string | null = null
  try {
    const outputsReply = await sendNiriRequest(niriSocketPath, '"Outputs"', cancellable)
    assertNiriRequestHandled(outputsReply)
    output = uniqueInternalOutput(niriOutputNames(outputsReply))
  } catch (cause) {
    onBackgroundError(cause)
  }

  let available =
    output !== null && Boolean(proxy.get_name_owner()) && cachedBoolean(proxy, "HasAccelerometer")
  let enabled = false
  let claimed = false
  let stopped = false
  let operation = Promise.resolve()
  let outputTimer = 0

  const applyOrientation = async (): Promise<void> => {
    const currentOutput = output
    const transform = orientationTransform(cachedString(proxy, "AccelerometerOrientation"))
    if (!currentOutput || !transform || stopped) return
    const reply = await sendNiriRequest(
      niriSocketPath,
      niriOutputTransformRequest(currentOutput, transform),
      cancellable,
    )
    assertNiriRequestHandled(reply)
  }

  const claim = async (): Promise<void> => {
    if (claimed) return
    await proxy.call("ClaimAccelerometer", null, Gio.DBusCallFlags.NONE, -1, cancellable)
    claimed = true
  }

  const release = async (releaseCancellable: Gio.Cancellable | null): Promise<void> => {
    if (!claimed) return
    await proxy.call("ReleaseAccelerometer", null, Gio.DBusCallFlags.NONE, -1, releaseCancellable)
    claimed = false
  }

  const setEnabledNow = async (next: boolean): Promise<void> => {
    if (stopped || !available || enabled === next) return
    if (next) {
      try {
        await claim()
        if (stopped) {
          await release(null)
          return
        }
        await applyOrientation()
        if (!settings.set_boolean(orientationLockKey, false)) {
          throw new Error("orientation-lock was not changed")
        }
      } catch (cause) {
        await release(cancellable).catch(onBackgroundError)
        throw cause
      }
    } else {
      await release(cancellable)
      if (!settings.set_boolean(orientationLockKey, true)) {
        await claim()
        await applyOrientation()
        throw new Error("orientation-lock was not changed")
      }
    }
    enabled = next
    onChanged()
  }

  const reconcileAvailability = async (): Promise<void> => {
    const hasOwner = Boolean(proxy.get_name_owner())
    const nextAvailable = output !== null && hasOwner && cachedBoolean(proxy, "HasAccelerometer")
    const changed = available !== nextAvailable || (!nextAvailable && enabled)
    available = nextAvailable
    if (!nextAvailable) enabled = false
    if (changed) onChanged()
    if (!hasOwner) claimed = false
    else if (!nextAvailable && claimed) await release(cancellable)
    if (available && !enabled && !settings.get_boolean(orientationLockKey)) {
      await setEnabledNow(true)
    }
  }

  const enqueueBackground = (perform: () => Promise<void>): void => {
    operation = operation.catch(() => undefined).then(perform)
    void operation.catch(onBackgroundError)
  }

  const refreshOutput = async (): Promise<void> => {
    try {
      const outputsReply = await sendNiriRequest(niriSocketPath, '"Outputs"', cancellable)
      assertNiriRequestHandled(outputsReply)
      output = uniqueInternalOutput(niriOutputNames(outputsReply))
      await reconcileAvailability()
      if (available && enabled) await applyOrientation()
    } catch (cause) {
      output = null
      await reconcileAvailability()
      throw cause
    }
  }

  const propertySignal = proxy.connect("g-properties-changed", () => {
    if (stopped) return
    enqueueBackground(async () => {
      await reconcileAvailability()
      if (available && enabled) await applyOrientation()
    })
  })
  const ownerSignal = proxy.connect("notify::g-name-owner", () => {
    if (stopped) return
    enqueueBackground(reconcileAvailability)
  })

  if (available && !settings.get_boolean(orientationLockKey)) await setEnabledNow(true)
  outputTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
    if (stopped) return GLib.SOURCE_REMOVE
    enqueueBackground(refreshOutput)
    return GLib.SOURCE_CONTINUE
  })

  return {
    snapshot: () => ({ available, enabled }),
    setEnabled: (next) => {
      operation = operation.catch(() => undefined).then(() => setEnabledNow(next))
      return operation
    },
    stop: () => {
      if (stopped) return
      stopped = true
      if (outputTimer !== 0) {
        GLib.source_remove(outputTimer)
        outputTimer = 0
      }
      proxy.disconnect(propertySignal)
      proxy.disconnect(ownerSignal)
      if (claimed) {
        void proxy
          .call("ReleaseAccelerometer", null, Gio.DBusCallFlags.NONE, -1, null)
          .then(() => {
            claimed = false
          })
          .catch(onBackgroundError)
      }
    },
  }
}
