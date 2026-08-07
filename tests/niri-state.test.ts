import { describe, expect, test } from "bun:test"

import {
  applyNiriEventLine,
  focusWindowRequest,
  focusWorkspaceRequest,
  initialNiriState,
} from "../src/niri/state"

const workspacesChanged = JSON.stringify({
  WorkspacesChanged: {
    workspaces: [
      {
        id: 7,
        idx: 2,
        name: "code",
        output: "DP-1",
        is_urgent: false,
        is_active: true,
        is_focused: true,
        active_window_id: 42,
      },
    ],
  },
})

const windowsChanged = JSON.stringify({
  WindowsChanged: {
    windows: [
      {
        id: 42,
        title: "Editor",
        app_id: "code",
        pid: 123,
        workspace_id: 7,
        is_focused: true,
        is_floating: false,
        is_urgent: false,
        layout: {
          pos_in_scrolling_layout: [1, 1],
          tile_size: [800, 900],
          window_size: [800, 900],
          tile_pos_in_workspace_view: [2, 1],
          window_offset_in_tile: [0, 0],
        },
        focus_timestamp: { secs: 10, nanos: 20 },
      },
    ],
  },
})

describe("Niri event replay", () => {
  test("encodes workspace focus by stable Niri workspace id", () => {
    expect(focusWorkspaceRequest(7)).toBe('{"Action":{"FocusWorkspace":{"reference":{"Id":7}}}}')
  })

  test("encodes window focus by stable Niri window id", () => {
    expect(focusWindowRequest(42)).toBe('{"Action":{"FocusWindow":{"id":42}}}')
  })

  test("builds workspace and window state from the initial event burst", () => {
    const afterWorkspaces = applyNiriEventLine(initialNiriState, workspacesChanged)
    const afterWindows = applyNiriEventLine(afterWorkspaces.state, windowsChanged)

    expect(afterWorkspaces.outcome).toBe("applied")
    expect(afterWindows.outcome).toBe("applied")
    expect(afterWindows.state.focusedWorkspaceId).toBe(7)
    expect(afterWindows.state.focusedWindowId).toBe(42)
  })

  test("retains the last good snapshot for malformed known events", () => {
    const ready = applyNiriEventLine(
      applyNiriEventLine(initialNiriState, workspacesChanged).state,
      windowsChanged,
    ).state
    const result = applyNiriEventLine(ready, '{"WindowsChanged":{"windows":"not-an-array"}}')

    expect(result.outcome).toBe("invalid")
    expect(result.state).toBe(ready)
  })

  test("ignores unknown future events without losing state", () => {
    const ready = applyNiriEventLine(initialNiriState, workspacesChanged).state
    const result = applyNiriEventLine(ready, '{"FutureNiriEvent":{"value":1}}')

    expect(result.outcome).toBe("ignored")
    expect(result.state).toBe(ready)
  })

  test("applies incremental window open, focus, and close events", () => {
    const opened = applyNiriEventLine(
      initialNiriState,
      JSON.stringify({
        WindowOpenedOrChanged: {
          window: {
            id: 9,
            title: "Terminal",
            app_id: "terminal",
            pid: 99,
            workspace_id: 3,
            is_focused: false,
            is_floating: false,
            is_urgent: false,
          },
        },
      }),
    )
    const focused = applyNiriEventLine(opened.state, '{"WindowFocusChanged":{"id":9}}')
    const closed = applyNiriEventLine(focused.state, '{"WindowClosed":{"id":9}}')

    expect(opened.state.windows.map((window) => window.id)).toEqual([9])
    expect(focused.state.focusedWindowId).toBe(9)
    expect(closed.state.windows).toEqual([])
    expect(closed.state.focusedWindowId).toBeNull()
  })

  test("moves active and focused workspace state within an output", () => {
    const initial = applyNiriEventLine(
      initialNiriState,
      JSON.stringify({
        WorkspacesChanged: {
          workspaces: [
            {
              id: 1,
              idx: 1,
              name: null,
              output: "DP-1",
              is_urgent: false,
              is_active: true,
              is_focused: true,
              active_window_id: null,
            },
            {
              id: 2,
              idx: 2,
              name: null,
              output: "DP-1",
              is_urgent: false,
              is_active: false,
              is_focused: false,
              active_window_id: null,
            },
          ],
        },
      }),
    ).state
    const changed = applyNiriEventLine(
      initial,
      '{"WorkspaceActivated":{"id":2,"focused":true}}',
    ).state

    expect(changed.workspaces.map((workspace) => workspace.is_active)).toEqual([false, true])
    expect(changed.focusedWorkspaceId).toBe(2)
  })
})
