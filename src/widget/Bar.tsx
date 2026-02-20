import { createConnection, For } from "ags"
import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import Pango from "gi://Pango"
import { niri } from "../lib/niri"

import {
  bar,
  content,
  workspaceRail,
  workspaceButton,
  workspaceDot,
  workspaceDotActive,
  windowTitle,
  metaLabel,
} from "./Bar.css"

type Workspace = {
  id: number
  idx: number
  name: string | null
  is_active: boolean
  active_window_id: number | null
}

type Window = {
  id: number
  title: string
  app_id?: string
  is_focused: boolean
}

type BarState = {
  activeWindowTitle: string
  activeApp: string
  keyboardLayout: string
  activeWorkspaceId: number | null
  workspacesById: Record<number, Workspace>
  activeWindowId: number | null
  windowsById: Record<number, Window>
}

const emptyState: BarState = {
  activeWindowTitle: "",
  activeApp: "",
  keyboardLayout: "",
  activeWorkspaceId: null,
  workspacesById: {},
  activeWindowId: null,
  windowsById: {},
}

function parsePayload<T>(payloadStr: string): T | null {
  try {
    return JSON.parse(payloadStr) as T
  } catch {
    return null
  }
}

type WorkspaceDot = Workspace & {
  isActive: boolean
}

function getWorkspaceDots(state: BarState): WorkspaceDot[] {
  return Object.values(state.workspacesById)
    .sort((a, b) => a.idx - b.idx)
    .map((workspace) => ({
      ...workspace,
      isActive: workspace.id === state.activeWorkspaceId,
    }))
}

function getWindowTitle(state: BarState): { title: string; app: string } {
  if (state.activeWindowId === null) {
    return { title: "", app: "" }
  }

  const activeWindow = state.windowsById[state.activeWindowId]
  const title = activeWindow?.title ?? ""
  const app = activeWindow?.app_id ?? ""

  return { title, app }
}

function withResolvedWindow(state: BarState): BarState {
  const active = getWindowTitle(state)

  return {
    ...state,
    activeWindowTitle: active.title,
    activeApp: active.app,
  }
}

const barState = createConnection(
  emptyState,
  [niri, "event", (eventName, payloadStr, currentState) => {
    switch (eventName) {
      case "WorkspacesChanged": {
        const payload = parsePayload<{ workspaces?: Workspace[] }>(payloadStr)
        const workspaces = payload?.workspaces ?? []
        const workspacesById = Object.fromEntries(
          workspaces.map((workspace) => [workspace.id, workspace]),
        ) as Record<number, Workspace>
        const activeWorkspace = workspaces.find((workspace) => workspace.is_active)
        const activeWorkspaceId = activeWorkspace?.id ?? currentState.activeWorkspaceId
        const activeWindowId = activeWorkspace?.active_window_id ?? currentState.activeWindowId

        const nextState: BarState = {
          ...currentState,
          workspacesById,
          activeWorkspaceId,
          activeWindowId,
        }

        return withResolvedWindow(nextState)
      }

      case "WorkspaceActivated": {
        const payload = parsePayload<{
          id?: number
          workspace_id?: number
          active_workspace_id?: number
          workspace?: { id?: number }
        }>(payloadStr)
        const activeWorkspaceId =
          payload?.id ??
          payload?.workspace_id ??
          payload?.active_workspace_id ??
          payload?.workspace?.id ??
          null
        const nextState: BarState = {
          ...currentState,
          activeWorkspaceId,
        }

        return nextState
      }

      case "WindowsChanged": {
        const payload = parsePayload<{ windows?: Window[] }>(payloadStr)
        const windows = payload?.windows ?? []
        const windowsById = Object.fromEntries(
          windows.map((window) => [window.id, window]),
        ) as Record<number, Window>
        const focusedWindow = windows.find((window) => window.is_focused)
        const activeWindowId = focusedWindow?.id ?? currentState.activeWindowId

        const nextState: BarState = {
          ...currentState,
          windowsById,
          activeWindowId,
        }

        return withResolvedWindow(nextState)
      }

      case "WindowFocusChanged": {
        const payload = parsePayload<{ id?: number }>(payloadStr)
        const activeWindowId = payload?.id ?? null
        const nextState: BarState = {
          ...currentState,
          activeWindowId,
        }

        return withResolvedWindow(nextState)
      }

      case "WindowOpenedOrChanged": {
        const payload = parsePayload<{ window?: Window }>(payloadStr)
        const window = payload?.window
        if (!window) {
          return currentState
        }

        const windowsById: Record<number, Window> = {
          ...currentState.windowsById,
          [window.id]: window,
        }
        const activeWindowId = window.is_focused
          ? window.id
          : currentState.activeWindowId

        const nextState: BarState = {
          ...currentState,
          windowsById,
          activeWindowId,
        }

        return withResolvedWindow(nextState)
      }

      case "WindowClosed": {
        const payload = parsePayload<{ id?: number }>(payloadStr)
        const closedWindowId = payload?.id
        if (closedWindowId === undefined) {
          return currentState
        }

        const windowsById = { ...currentState.windowsById }
        delete windowsById[closedWindowId]

        const activeWindowId =
          currentState.activeWindowId === closedWindowId
            ? null
            : currentState.activeWindowId

        const nextState: BarState = {
          ...currentState,
          windowsById,
          activeWindowId,
        }

        return withResolvedWindow(nextState)
      }

      case "KeyboardLayoutsChanged": {
        const payload = parsePayload<{
          keyboard_layouts?: { names?: string[]; current_idx?: number }
        }>(payloadStr)
        const names = payload?.keyboard_layouts?.names ?? []
        const currentIdx = payload?.keyboard_layouts?.current_idx ?? -1

        return {
          ...currentState,
          keyboardLayout: names[currentIdx] ?? "",
        }
      }

      default:
        return currentState
    }
  }],
)

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      visible
      name="bar"
      class={bar}
      heightRequest={32}
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      <box
        class={content}
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={6}
        hexpand
      >
        <box class={workspaceRail} orientation={Gtk.Orientation.VERTICAL} spacing={2}>
          <For each={barState(getWorkspaceDots)}>
            {(workspace: WorkspaceDot) => (
              <button
                class={workspaceButton}
                onClicked={() => niri.focusWorkspace(workspace.idx)}
              >
                <label
                  class={`${workspaceDot} ${workspace.isActive ? workspaceDotActive : ""}`}
                  label="●"
                />
              </button>
            )}
          </For>
        </box>
        <label
          class={windowTitle}
          wrap={false}
          ellipsize={Pango.EllipsizeMode.END}
          xalign={0.5}
          hexpand
          halign={Gtk.Align.FILL}
          label={barState((state) => state.activeWindowTitle)}
        />
        <label class={metaLabel} xalign={1} label={barState((state) => state.keyboardLayout)} />
      </box>
    </window>
  )
}
