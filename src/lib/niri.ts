import Gio from "gi://Gio"
import GLib from "gi://GLib"

import GObject, { register, signal, getter, property } from "gnim/gobject"

import { Effect, pipe } from "effect"
import { match, P } from "ts-pattern"

import * as Niri from "./niri-types"

@register()
export class NiriService extends GObject.Object {
  private static _instance: NiriService | null = null
  static get_default(): NiriService {
    if (!this._instance) {
      this._instance = new NiriService()
    }
    return this._instance
  }

  // Reactive properties for gnim
  @property(Object) focusedWindow: Niri.Window = {} as Niri.Window
  @property(Object) windows: Niri.Window[] = []

  constructor() {
    super()
    this.init()
  }

  private getSocketAddress(): Gio.UnixSocketAddress {
    const socketPath = GLib.getenv("NIRI_SOCKET")
    if (!socketPath) throw new Error("NIRI_SOCKET environment variable is not set")
    return Gio.UnixSocketAddress.new(socketPath)
  }

  // Send a synchronous/one-off command
  public message(request: Niri.Request) {
    const reqString = pipe(
      match(request)
        .with(
          {
            type: P.union("Action", "Output"),
          },
          ({ type, ...data }) => ({
            [type]: data,
          }),
        )
        .otherwise(({ type }) => type),
      (obj) => JSON.stringify(obj) + "\n",
    )

    return Effect.callback<Niri.Response, Error>((resume) => {
      const client = new Gio.SocketClient()
      const address = this.getSocketAddress()
      client.connect_async(address, null, (client, result) => {
        const connection = client?.connect_finish(result)
        if (!connection) return
        const output = new Gio.DataOutputStream({ base_stream: connection.get_output_stream() })
        const input = new Gio.DataInputStream({ base_stream: connection.get_input_stream() })
        output.put_string(reqString, null)

        input.read_line_async(GLib.PRIORITY_DEFAULT, null, (inStream, readRes) => {
          if (!inStream) {
            return resume(Effect.fail(new Error("Failed to read response from Niri")))
          }
          const [line] = inStream.read_line_finish_utf8(readRes)
          if (!line) {
            return resume(Effect.fail(new Error("Received empty response from Niri")))
          }
          const parsed: Niri.Reply = JSON.parse(line)
          if ("Err" in parsed) {
            return resume(Effect.fail(new Error(parsed.Err)))
          }
          return resume(Effect.succeed(parsed.Ok))
        })
      })
    })
  }

  private async init() {
    // Initial state sync via one-off requests
    await this.syncInitialState()
    // Start long-running event stream
    this.startWatchSocket()
  }

  private async syncInitialState() {
    const reply = await Effect.runPromise(this.message({ type: "FocusedWindow" }))
  }

  private startWatchSocket() {
    const client = new Gio.SocketClient()
    const address = this.getSocketAddress()

    client.connect_async(address, null, (client, result) => {
      const connection = client?.connect_finish(result)
      if (!connection) return
      const output = new Gio.DataOutputStream({ base_stream: connection.get_output_stream() })
      const input = new Gio.DataInputStream({ base_stream: connection.get_input_stream() })

      // Request event stream mode
      output.put_string(`"EventStream"\n`, null)

      // Start recursive reading loop
      this.readEvent(input)
    })
  }

  private readEvent(input: Gio.DataInputStream) {
    input.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, result) => {
      if (!stream) return
      const [line] = stream.read_line_finish_utf8(result)
      if (line) {
        const eventObj = JSON.parse(line)
        const eventType = Object.keys(eventObj)[0] as Niri.EventType
        const event: Niri.Event = {
          type: eventType,
          ...eventObj[eventType],
        }
        this.handleEvent(event)
        this.readEvent(stream) // Read next line
      }
    })
  }

  // Parse events and update state
  private handleEvent(event: Niri.Event) {
    switch (event.type) {
      case "WindowsChanged":
        this.windows = event.windows
        this.focusedWindow = event.windows.find((w) => w.isFocused) ?? ({} as Niri.Window)
        break
      case "WindowFocusChanged":
        this.focusedWindow = this.windows.find((w) => w.id === event.id) ?? ({} as Niri.Window)
        break
      case "WindowLayoutsChanged":
        break
      // Handle other events as needed...
    }
  }
}
