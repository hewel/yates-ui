import GObject, { register, property } from "gnim/gobject"

import { Effect, Stream, SubscriptionRef } from "effect"
import { produce } from "immer"

import * as Niri from "./niri.types"
import { eventStream, sendMessage } from "./socket"

export type NiriState = {
  focusedWindow: Niri.Window
  windows: Niri.Window[]
  focusedWorkspace: Niri.Workspace
  workspaces: Niri.Workspace[]
  layout: Niri.WindowLayout
}

const reducer = (event: Niri.Event) =>
  produce<NiriState>((state) => {
    switch (event.type) {
      case "WindowsChanged":
        state.windows = event.windows
        break
      case "WindowFocusChanged":
        state.focusedWindow = state.windows.find((w) => w.id === event.id) ?? ({} as Niri.Window)
        break
      case "WindowLayoutsChanged":
        break
      // Handle other events as needed...
    }
  })

const stateRef = SubscriptionRef.make<NiriState>({
  focusedWindow: {} as Niri.Window,
  windows: [],
  focusedWorkspace: {} as Niri.Workspace,
  workspaces: [],
  layout: {} as Niri.WindowLayout,
})

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
      Stream.runForEach((event) =>
        stateRef.pipe(Effect.flatMap((state) => SubscriptionRef.update(state, reducer(event)))),
      ),
      Effect.runPromise,
    )
  }
}
