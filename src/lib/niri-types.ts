// Base Types
export interface Overview {
  is_open: boolean
}

export interface WindowLayout {
  // Position of the tiled window in the scrolling layout (column index, tile index inside column)
  pos_in_scrolling_layout: [number, number] | null

  // Size of the tile including decorations (width, height)
  tile_size: [number, number]

  // Visual geometry size of the window itself excluding niri decorations (width, height)
  window_size: [number, number]

  // Top-left position of the tile in the workspace view
  tile_pos_in_workspace_view: [number, number] | null

  // Visual geometry offset within its tile
  window_offset_in_tile: [number, number]
}

// Placeholder types for complex entities not fully detailed in the schema
export type Output = Record<string, unknown>
export type Workspace = { id: number; [key: string]: any }
export type Window = { id: number; [key: string]: any }
export type Layer = Record<string, unknown>
export type KeyboardLayouts = Record<string, unknown>
export type PickedColor = Record<string, unknown>
export type Cast = { stream_id: number; [key: string]: any }
export type Timestamp = Record<string, unknown>

// Responses (from standard requests)
export type Response =
  | "Handled"
  | { Version: string }
  | { Outputs: Record<string, Output> }
  | { Workspaces: Workspace[] }
  | { Windows: Window[] }
  | { Layers: Layer[] }
  | { KeyboardLayouts: KeyboardLayouts }
  | { FocusedOutput: Output | null }
  | { FocusedWindow: Window | null }
  | { PickedWindow: Window | null }
  | { PickedColor: PickedColor | null }
  | { OutputConfigChanged: string | Record<string, unknown> }
  | { OverviewState: Overview }
  | { Casts: Cast[] }

// The top-level reply from niri, handling Result<Response, String>
export type Reply = Response | string

// Events (from the EventStream request)
export type Event =
  | { WorkspacesChanged: { workspaces: Workspace[] } }
  | { WorkspaceUrgencyChanged: { id: number; urgent: boolean } }
  | { WorkspaceActivated: { id: number; focused: boolean } }
  | {
      WorkspaceActiveWindowChanged: {
        workspace_id: number
        active_window_id: number
      }
    }
  | { WindowsChanged: { windows: Window[] } }
  | { WindowOpenedOrChanged: { window: Window } }
  | { WindowClosed: { id: number } }
  | { WindowFocusChanged: { id: number } }
  | { WindowFocusTimestampChanged: { id: number; focus_timestamp: Timestamp } }
  | { WindowUrgencyChanged: { id: number; urgent: boolean } }
  | { WindowLayoutsChanged: { changes: [number, WindowLayout][] } }
  | { KeyboardLayoutsChanged: { keyboard_layouts: KeyboardLayouts } }
  | { KeyboardLayoutSwitched: { idx: number } }
  | { OverviewOpenedOrClosed: { is_open: boolean } }
  | { ConfigLoaded: { failed: boolean } }
  | { ScreenshotCaptured: { path: string } }
  | { CastsChanged: { casts: Cast[] } }
  | { CastStartedOrChanged: { cast: Cast } }
  | { CastStopped: { stream_id: number } }
