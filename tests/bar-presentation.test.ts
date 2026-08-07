import { describe, expect, test } from "bun:test"

import { NiriState } from "../src/niri/state"
import { projectBarPresentation } from "../src/widget/bar/barPresentation"

const state: NiriState = {
  workspaces: [
    {
      id: 12,
      idx: 2,
      name: "chat",
      output: "DP-1",
      is_urgent: false,
      is_active: false,
      is_focused: false,
      active_window_id: null,
    },
    {
      id: 21,
      idx: 1,
      name: "other-output",
      output: "HDMI-A-1",
      is_urgent: false,
      is_active: true,
      is_focused: false,
      active_window_id: null,
    },
    {
      id: 11,
      idx: 1,
      name: null,
      output: "DP-1",
      is_urgent: false,
      is_active: true,
      is_focused: true,
      active_window_id: 102,
    },
  ],
  windows: [
    {
      id: 102,
      title: "Editor",
      app_id: "code",
      workspace_id: 11,
      is_focused: true,
      is_floating: false,
      is_urgent: false,
      layout: { tile_pos_in_workspace_view: [20, 0] },
    },
    {
      id: 201,
      title: "Foreign",
      app_id: "browser",
      workspace_id: 21,
      is_focused: false,
      is_floating: false,
      is_urgent: false,
      layout: { tile_pos_in_workspace_view: [1, 0] },
    },
    {
      id: 101,
      title: "Terminal",
      app_id: "terminal",
      workspace_id: 11,
      is_focused: false,
      is_floating: false,
      is_urgent: false,
      layout: { tile_pos_in_workspace_view: [10, 0] },
    },
    {
      id: 120,
      title: null,
      app_id: null,
      workspace_id: 12,
      is_focused: false,
      is_floating: false,
      is_urgent: false,
    },
  ],
  focusedWorkspaceId: 11,
  focusedWindowId: 102,
  sequence: 1,
}

describe("bar presentation", () => {
  test("projects monitor workspaces, focus, labels, and popup windows in display order", () => {
    expect(projectBarPresentation(state, "DP-1")).toEqual({
      workspaces: [
        {
          id: 11,
          label: "1",
          focused: true,
          popupWindows: [
            { id: 101, title: "Terminal", appId: "terminal" },
            { id: 102, title: "Editor", appId: "code" },
          ],
        },
        {
          id: 12,
          label: "chat",
          focused: false,
          popupWindows: [{ id: 120, title: null, appId: null }],
        },
      ],
      focusedWindowTitle: "Editor",
    })
  })

  test("returns no workspaces and an empty title for an empty state", () => {
    const empty: NiriState = {
      workspaces: [],
      windows: [],
      focusedWorkspaceId: null,
      focusedWindowId: null,
      sequence: 0,
    }

    expect(projectBarPresentation(empty, "DP-1")).toEqual({
      workspaces: [],
      focusedWindowTitle: "",
    })
  })

  test("uses zero as the window position when layout data is missing", () => {
    const missingLayout: NiriState = {
      ...state,
      windows: [
        state.windows[0],
        {
          id: 100,
          title: "Files",
          app_id: "files",
          workspace_id: 11,
          is_focused: false,
          is_floating: false,
          is_urgent: false,
        },
        state.windows[2],
      ],
    }

    expect(
      projectBarPresentation(missingLayout, "DP-1").workspaces[0]?.popupWindows.map(
        (window) => window.id,
      ),
    ).toEqual([100, 101, 102])
  })
})
