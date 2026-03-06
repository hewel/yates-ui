import Gio from "gi://Gio"
import GLib from "gi://GLib"

import GObject, { register, property } from "gnim/gobject"

import { Effect, Stream, Console } from "effect"

import * as Niri from "./niri.types"
import { eventStream, sendMessage } from "./socket"

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

  private init() {
    // Initial state sync via one-off requests
    this.syncInitialState()
    this.startWatchSocket()
  }

  private async syncInitialState() {
    this.focusedWindow = await Effect.runPromise(sendMessage({ type: "FocusedWindow" }))
  }

  // Send a synchronous/one-off command
  public message<R extends Niri.Request>(request: R): Effect.Effect<Niri.ResponseFor<R>, Error> {
    return sendMessage(request)
  }

  private startWatchSocket() {
    eventStream.pipe(
      Stream.runForEach((event) => Console.log(event)),
      Effect.runPromise,
    )
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
