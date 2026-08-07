import { describe, expect, test } from "bun:test"

import { applyNiriEventLine, initialNiriState, stopCastRequest } from "../src/niri/state"
import {
  createFixturePrivacyStatusModule,
  projectNiriCasts,
  projectPrivacyStatus,
} from "../src/services/privacyStatusModel"

const pipeWireCast = {
  stream_id: 51,
  session_id: 19,
  kind: "PipeWire",
  target: { Output: { name: "DP-1" } },
  is_dynamic_target: false,
  is_active: true,
  pid: null,
  pw_node_id: 901,
}

const screencopyCast = {
  stream_id: 52,
  session_id: 20,
  kind: "WlrScreencopy",
  target: { Window: { id: 7 } },
  is_dynamic_target: false,
  is_active: false,
  pid: 1234,
  pw_node_id: null,
}

describe("Niri cast state and privacy presentation", () => {
  test("encodes StopCast with the session id expected by Niri", () => {
    expect(stopCastRequest(19)).toBe('{"Action":{"StopCast":{"session_id":19}}}')
  })

  test("replaces, updates, and removes casts from the decoded event stream", () => {
    const changed = applyNiriEventLine(
      initialNiriState,
      JSON.stringify({ CastsChanged: { casts: [pipeWireCast, screencopyCast] } }),
    )
    const updated = applyNiriEventLine(
      changed.state,
      JSON.stringify({
        CastStartedOrChanged: {
          cast: { ...pipeWireCast, is_active: false },
        },
      }),
    )
    const stopped = applyNiriEventLine(
      updated.state,
      JSON.stringify({ CastStopped: { stream_id: 51 } }),
    )

    expect(changed.outcome).toBe("applied")
    expect(changed.state.casts.map((cast) => cast.stream_id)).toEqual([51, 52])
    expect(updated.state.casts.find((cast) => cast.stream_id === 51)?.is_active).toBe(false)
    expect(stopped.state.casts.map((cast) => cast.stream_id)).toEqual([52])
  })

  test("accepts the string Nothing target for protocol compatibility", () => {
    const next = applyNiriEventLine(
      initialNiriState,
      JSON.stringify({
        CastStartedOrChanged: {
          cast: {
            stream_id: 41,
            session_id: 9,
            kind: "PipeWire",
            target: "Nothing",
            is_dynamic_target: true,
            is_active: true,
            pid: null,
            pw_node_id: 72,
          },
        },
      }),
    )

    expect(next.outcome).toBe("applied")
    expect(next.state.casts).toHaveLength(1)
    expect(next.state.casts[0]?.target).toBe("Nothing")
  })

  test("keeps the last good cast state when a known cast event is malformed", () => {
    const ready = applyNiriEventLine(
      initialNiriState,
      JSON.stringify({ CastsChanged: { casts: [pipeWireCast] } }),
    ).state
    const malformed = applyNiriEventLine(
      ready,
      '{"CastStartedOrChanged":{"cast":{"stream_id":"bad"}}}',
    )

    expect(malformed.outcome).toBe("invalid")
    expect(malformed.state).toBe(ready)
  })

  test("labels cast targets and only offers stop for PipeWire sessions", () => {
    const state = {
      ...initialNiriState,
      windows: [
        {
          id: 7,
          title: "Meeting",
          app_id: "browser",
          workspace_id: 1,
          is_focused: false,
          is_floating: false,
          is_urgent: false,
        },
      ],
    }
    const withCasts = applyNiriEventLine(
      state,
      JSON.stringify({ CastsChanged: { casts: [pipeWireCast, screencopyCast] } }),
    ).state

    expect(projectNiriCasts(withCasts)).toEqual([
      {
        streamId: 51,
        sessionId: 19,
        kind: "pipewire",
        targetLabel: "Screen “DP-1”",
        active: true,
        canStop: true,
      },
      {
        streamId: 52,
        sessionId: 20,
        kind: "wlr-screencopy",
        targetLabel: "Window “Meeting”",
        active: false,
        canStop: false,
      },
    ])
  })

  test("clears stale casts when Niri disconnects and gates recorder capabilities", () => {
    const withCast = applyNiriEventLine(
      initialNiriState,
      JSON.stringify({ CastsChanged: { casts: [pipeWireCast] } }),
    ).state

    expect(
      projectPrivacyStatus({
        niriState: withCast,
        niriConnected: false,
        wirePlumberConnected: true,
        microphoneRecorderCount: 2,
        cameraRecorderCount: null,
      }),
    ).toEqual({
      screenSharingAvailable: false,
      casts: [],
      microphone: { available: true, active: true, count: 2 },
      camera: { available: false, active: false, count: 0 },
    })
  })

  test("exposes privacy activity only in the complex fixture and stops its controllable cast", () => {
    const fixture = createFixturePrivacyStatusModule("complex")
    const snapshots: Array<number> = []
    const unsubscribe = fixture.subscribe((state) => snapshots.push(state.casts.length))

    expect(fixture.snapshot().microphone.active).toBe(true)
    expect(fixture.snapshot().camera.active).toBe(true)
    fixture.stopCast(17)
    fixture.stopCast(999)

    expect(fixture.snapshot().casts).toEqual([])
    expect(snapshots).toEqual([0])
    unsubscribe()
    fixture.stop()
    fixture.stop()
    expect(createFixturePrivacyStatusModule("laptop").snapshot().casts).toEqual([])
  })
})
