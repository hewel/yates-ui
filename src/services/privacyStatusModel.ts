import { NiriState } from "../niri/state"

export type PrivacyCastKind = "pipewire" | "wlr-screencopy"

export interface PrivacyCastPresentation {
  readonly streamId: number
  readonly sessionId: number
  readonly kind: PrivacyCastKind
  readonly targetLabel: string
  readonly active: boolean
  readonly canStop: boolean
}

export interface PrivacyCaptureStatus {
  readonly available: boolean
  readonly active: boolean
  readonly count: number
}

export interface PrivacyStatusState {
  readonly screenSharingAvailable: boolean
  readonly casts: ReadonlyArray<PrivacyCastPresentation>
  readonly microphone: PrivacyCaptureStatus
  readonly camera: PrivacyCaptureStatus
}

export interface PrivacyStatusModule {
  snapshot(): PrivacyStatusState
  subscribe(listener: (state: PrivacyStatusState) => void): () => void
  stopCast(sessionId: number): void
  stop(): void
}

export const emptyPrivacyStatusState: PrivacyStatusState = {
  screenSharingAvailable: false,
  casts: [],
  microphone: { available: false, active: false, count: 0 },
  camera: { available: false, active: false, count: 0 },
}

function castTargetLabel(state: NiriState, streamId: number): string {
  const cast = (state.casts ?? []).find((candidate) => candidate.stream_id === streamId)
  if (!cast) return "Screen sharing"
  if (typeof cast.target !== "string" && "Output" in cast.target)
    return `Screen “${cast.target.Output.name}”`
  if (typeof cast.target !== "string" && "Window" in cast.target) {
    const windowId = cast.target.Window.id
    const window = state.windows.find((candidate) => candidate.id === windowId)
    return window?.title ? `Window “${window.title}”` : `Window ${windowId}`
  }
  return cast.is_dynamic_target ? "Dynamic cast target" : "Screen sharing"
}

export function projectNiriCasts(state: NiriState): ReadonlyArray<PrivacyCastPresentation> {
  return (state.casts ?? []).map((cast) => ({
    streamId: cast.stream_id,
    sessionId: cast.session_id,
    kind: cast.kind === "PipeWire" ? "pipewire" : "wlr-screencopy",
    targetLabel: castTargetLabel(state, cast.stream_id),
    active: cast.is_active,
    canStop: cast.kind === "PipeWire",
  }))
}

export function projectPrivacyStatus(options: {
  readonly niriState: NiriState
  readonly niriConnected: boolean
  readonly wirePlumberConnected: boolean
  readonly microphoneRecorderCount: number | null
  readonly cameraRecorderCount: number | null
}): PrivacyStatusState {
  const microphoneAvailable =
    options.wirePlumberConnected && options.microphoneRecorderCount !== null
  const cameraAvailable = options.wirePlumberConnected && options.cameraRecorderCount !== null

  return {
    screenSharingAvailable: options.niriConnected,
    casts: options.niriConnected ? projectNiriCasts(options.niriState) : [],
    microphone: {
      available: microphoneAvailable,
      active: microphoneAvailable && options.microphoneRecorderCount > 0,
      count: microphoneAvailable ? options.microphoneRecorderCount : 0,
    },
    camera: {
      available: cameraAvailable,
      active: cameraAvailable && options.cameraRecorderCount > 0,
      count: cameraAvailable ? options.cameraRecorderCount : 0,
    },
  }
}

export function createFixturePrivacyStatusModule(profile: string): PrivacyStatusModule {
  let stopped = false
  let state: PrivacyStatusState =
    profile === "complex"
      ? {
          screenSharingAvailable: true,
          casts: [
            {
              streamId: 41,
              sessionId: 17,
              kind: "pipewire",
              targetLabel: "Screen “DP-1”",
              active: true,
              canStop: true,
            },
          ],
          microphone: { available: true, active: true, count: 1 },
          camera: { available: true, active: true, count: 1 },
        }
      : emptyPrivacyStatusState
  const listeners = new Set<(state: PrivacyStatusState) => void>()

  const publish = (next: PrivacyStatusState) => {
    state = next
    for (const listener of listeners) listener(state)
  }

  return {
    snapshot: () => state,
    subscribe: (listener) => {
      if (stopped) return () => undefined
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    stopCast: (sessionId) => {
      if (stopped) return
      const casts = state.casts.filter((cast) => cast.sessionId !== sessionId || !cast.canStop)
      if (casts.length !== state.casts.length) publish({ ...state, casts })
    },
    stop: () => {
      if (stopped) return
      stopped = true
      listeners.clear()
    },
  }
}
