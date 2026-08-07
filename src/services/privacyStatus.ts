import Wp from "gi://AstalWp"

import { Effect, Schema } from "effect"

import { diagnosticLog } from "../debug/log"
import { NiriStateSource } from "../niri/source"
import {
  PrivacyStatusModule,
  PrivacyStatusState,
  createFixturePrivacyStatusModule,
  emptyPrivacyStatusState,
  projectPrivacyStatus,
} from "./privacyStatusModel"

class PrivacyStatusReadError extends Schema.TaggedError<PrivacyStatusReadError>()(
  "PrivacyStatusReadError",
  {
    source: Schema.String,
    cause: Schema.Defect,
  },
) {}

const readRecorderCount = Effect.fn("PrivacyStatus.readRecorderCount")(function* (
  source: string,
  read: () => ReadonlyArray<unknown> | null,
) {
  return yield* Effect.try({
    try: () => read()?.length ?? 0,
    catch: (cause) => PrivacyStatusReadError.make({ source, cause }),
  })
})

function recorderCount(source: string, read: () => ReadonlyArray<unknown> | null): number | null {
  return Effect.runSync(
    readRecorderCount(source, read).pipe(
      Effect.match({
        onFailure: (error) => {
          diagnosticLog("privacy-status.read.failed", { source: error.source })
          return null
        },
        onSuccess: (count) => count,
      }),
    ),
  )
}

function createLivePrivacyStatusModule(niri: NiriStateSource): PrivacyStatusModule {
  const wp = Wp.get_default()
  const audio = wp.audio
  const video = wp.video
  let stopped = false
  let state: PrivacyStatusState = emptyPrivacyStatusState
  const listeners = new Set<(state: PrivacyStatusState) => void>()
  const disconnectors: Array<() => void> = []

  const publish = (next: PrivacyStatusState) => {
    state = next
    for (const listener of listeners) listener(state)
  }

  const refresh = () => {
    if (stopped) return
    const wirePlumberConnected = wp.connected
    publish(
      projectPrivacyStatus({
        niriState: niri.state.peek(),
        niriConnected: niri.connected.peek(),
        wirePlumberConnected,
        microphoneRecorderCount: wirePlumberConnected
          ? recorderCount("microphone", () => audio.get_recorders())
          : null,
        cameraRecorderCount: wirePlumberConnected
          ? recorderCount("camera", () => video.get_recorders())
          : null,
      }),
    )
  }

  disconnectors.push(niri.state.subscribe(refresh), niri.connected.subscribe(refresh))

  const wpConnectedSignal = wp.connect("notify::connected", refresh)
  const audioAddedSignal = audio.connect("recorder-added", refresh)
  const audioRemovedSignal = audio.connect("recorder-removed", refresh)
  const videoAddedSignal = video.connect("recorder-added", refresh)
  const videoRemovedSignal = video.connect("recorder-removed", refresh)
  disconnectors.push(
    () => wp.disconnect(wpConnectedSignal),
    () => audio.disconnect(audioAddedSignal),
    () => audio.disconnect(audioRemovedSignal),
    () => video.disconnect(videoAddedSignal),
    () => video.disconnect(videoRemovedSignal),
  )

  refresh()

  return {
    snapshot: () => state,
    subscribe: (listener) => {
      if (stopped) return () => undefined
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    stopCast: (sessionId) => {
      if (stopped) return
      if (!state.casts.some((cast) => cast.sessionId === sessionId && cast.canStop)) return
      niri.stopCast(sessionId)
    },
    stop: () => {
      if (stopped) return
      stopped = true
      for (const disconnect of disconnectors) disconnect()
      listeners.clear()
    },
  }
}

export function createPrivacyStatusModule(options: {
  readonly fixtureMode: boolean
  readonly fixtureProfile: string
  readonly niri: NiriStateSource
}): PrivacyStatusModule {
  return options.fixtureMode
    ? createFixturePrivacyStatusModule(options.fixtureProfile)
    : createLivePrivacyStatusModule(options.niri)
}
