import { createConnection } from "ags"
import { niri } from "../../lib/niri"
import { BarState, Workspace, WorkspaceDot, Window, emptyState } from "./types"

function parsePayload<T>(payloadStr: string): T | null {
  try {
    return JSON.parse(payloadStr) as T
  } catch {
    return null
  }
}

function getWindowTitle(state: BarState): { title: string; app: string } {
  if (state.activeWindowId === null) {
    return { title: "", app: "" }
  }

  const activeWindow = state.windowsById[state.activeWindowId]
  return {
    title: activeWindow?.title ?? "",
    app: activeWindow?.app_id ?? "",
  }
}

function withResolvedWindow(state: BarState): BarState {
  const active = getWindowTitle(state)

  return {
    ...state,
    activeWindowTitle: active.title,
    activeApp: active.app,
  }
}

export function getWorkspaceDots(state: BarState): WorkspaceDot[] {
  return Object.values(state.workspacesById)
    .sort((a, b) => a.idx - b.idx)
    .map((workspace) => ({
      ...workspace,
      isActive: workspace.id === state.activeWorkspaceId,
    }))
}

export const barState = createConnection(
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

        return withResolvedWindow({
          ...currentState,
          workspacesById,
          activeWorkspaceId,
          activeWindowId,
        })
      }

      case "WorkspaceActivated": {
        const payload = parsePayload<{
          id?: number
          workspace_id?: number
          active_workspace_id?: number
          workspace?: { id?: number }
        }>(payloadStr)

        return {
          ...currentState,
          activeWorkspaceId:
            payload?.id ??
            payload?.workspace_id ??
            payload?.active_workspace_id ??
            payload?.workspace?.id ??
            null,
        }
      }

      case "WindowsChanged": {
        const payload = parsePayload<{ windows?: Window[] }>(payloadStr)
        const windows = payload?.windows ?? []
        const windowsById = Object.fromEntries(
          windows.map((window) => [window.id, window]),
        ) as Record<number, Window>
        const focusedWindow = windows.find((window) => window.is_focused)
        const activeWindowId = focusedWindow?.id ?? currentState.activeWindowId

        return withResolvedWindow({
          ...currentState,
          windowsById,
          activeWindowId,
        })
      }

      case "WindowFocusChanged": {
        const payload = parsePayload<{ id?: number }>(payloadStr)

        return withResolvedWindow({
          ...currentState,
          activeWindowId: payload?.id ?? null,
        })
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

        return withResolvedWindow({
          ...currentState,
          windowsById,
          activeWindowId: window.is_focused ? window.id : currentState.activeWindowId,
        })
      }

      case "WindowClosed": {
        const payload = parsePayload<{ id?: number }>(payloadStr)
        const closedWindowId = payload?.id
        if (closedWindowId === undefined) {
          return currentState
        }

        const windowsById = { ...currentState.windowsById }
        delete windowsById[closedWindowId]

        return withResolvedWindow({
          ...currentState,
          windowsById,
          activeWindowId:
            currentState.activeWindowId === closedWindowId ? null : currentState.activeWindowId,
        })
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
