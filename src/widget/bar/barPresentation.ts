import type { NiriState, NiriWindow } from "../../niri/state"

export interface BarPopupWindowPresentation {
  readonly id: number
  readonly title: string | null
  readonly appId: string | null
}

export interface BarWorkspacePresentation {
  readonly id: number
  readonly label: string
  readonly focused: boolean
  readonly popupWindows: ReadonlyArray<BarPopupWindowPresentation>
}

export interface BarPresentation {
  readonly workspaces: ReadonlyArray<BarWorkspacePresentation>
  readonly focusedWindowTitle: string
}

function windowPosition(window: NiriWindow): number {
  return window.layout?.tile_pos_in_workspace_view?.[0] ?? 0
}

function popupWindows(
  state: NiriState,
  workspaceId: number,
): ReadonlyArray<BarPopupWindowPresentation> {
  return state.windows
    .filter((window) => window.workspace_id === workspaceId)
    .toSorted((left, right) => windowPosition(left) - windowPosition(right))
    .map((window) => ({
      id: window.id,
      title: window.title,
      appId: window.app_id,
    }))
}

export function projectBarPresentation(state: NiriState, connector: string): BarPresentation {
  return {
    workspaces: state.workspaces
      .filter((workspace) => workspace.output === connector)
      .toSorted((left, right) => left.idx - right.idx)
      .map((workspace) => ({
        id: workspace.id,
        label: workspace.name ?? String(workspace.idx),
        focused: workspace.id === state.focusedWorkspaceId,
        popupWindows: popupWindows(state, workspace.id),
      })),
    focusedWindowTitle:
      state.windows.find((window) => window.id === state.focusedWindowId)?.title ?? "",
  }
}
