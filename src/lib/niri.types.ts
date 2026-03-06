export type Request =
  | { type: "Version" }
  | { type: "Outputs" }
  | { type: "Workspaces" }
  | { type: "Windows" }
  | { type: "Layers" }
  | { type: "KeyboardLayouts" }
  | { type: "FocusedOutput" }
  | { type: "FocusedWindow" }
  | { type: "PickWindow" }
  | { type: "PickColor" }
  | { type: "Action"; action: Action }
  | { type: "Output"; output: string; action: OutputAction }
  | { type: "EventStream" }
  | { type: "ReturnError" }
  | { type: "OverviewState" }
  | { type: "Casts" }

// Core Action Types
export type Action =
  | { type: "Quit"; skipConfirmation: boolean }
  | { type: "PowerOffMonitors" }
  | { type: "PowerOnMonitors" }
  | { type: "Spawn"; command: string[] }
  | { type: "SpawnSh"; command: string }
  | { type: "DoScreenTransition"; delayMs?: number }
  | { type: "Screenshot"; showPointer: boolean; path?: string }
  | { type: "ScreenshotScreen"; writeToDisk: boolean; showPointer: boolean; path?: string }
  | {
      type: "ScreenshotWindow"
      id?: number
      writeToDisk: boolean
      showPointer: boolean
      path?: string
    }
  | { type: "ToggleKeyboardShortcutsInhibit" }
  | { type: "CloseWindow"; id?: number }
  | { type: "FullscreenWindow"; id?: number }
  | { type: "ToggleWindowedFullscreen"; id?: number }
  | { type: "FocusWindow"; id?: number }
  | { type: "FocusWindowInColumn"; index: number }
  | { type: "FocusWindowPrevious" }
  | { type: "FocusColumnLeft" }
  | { type: "FocusColumnRight" }
  | { type: "FocusColumnFirst" }
  | { type: "FocusColumnLast" }
  | { type: "FocusColumnRightOrFirst" }
  | { type: "FocusColumnLeftOrLast" }
  | { type: "FocusColumn"; index: number }
  | { type: "FocusWindowOrMonitorUp" }
  | { type: "FocusWindowOrMonitorDown" }
  | { type: "FocusColumnOrMonitorLeft" }
  | { type: "FocusColumnOrMonitorRight" }
  | { type: "FocusWindowDown" }
  | { type: "FocusWindowUp" }
  | { type: "FocusWindowDownOrColumnLeft" }
  | { type: "FocusWindowDownOrColumnRight" }
  | { type: "FocusWindowUpOrColumnLeft" }
  | { type: "FocusWindowUpOrColumnRight" }
  | { type: "FocusWindowOrWorkspaceDown" }
  | { type: "FocusWindowOrWorkspaceUp" }
  | { type: "FocusWindowTop" }
  | { type: "FocusWindowBottom" }
  | { type: "FocusWindowDownOrTop" }
  | { type: "FocusWindowUpOrBottom" }
  | { type: "MoveColumnLeft" }
  | { type: "MoveColumnRight" }
  | { type: "MoveColumnToFirst" }
  | { type: "MoveColumnToLast" }
  | { type: "MoveColumnToIndex"; index: number }
  | { type: "MoveColumnLeftOrToMonitorLeft" }
  | { type: "MoveColumnRightOrToMonitorRight" }
  | { type: "MoveWindowDown" }
  | { type: "MoveWindowUp" }
  | { type: "MoveWindowDownOrToWorkspaceDown" }
  | { type: "MoveWindowUpOrToWorkspaceUp" }
  | { type: "ConsumeOrExpelWindowLeft"; id?: number }
  | { type: "ConsumeOrExpelWindowRight"; id?: number }
  | { type: "ConsumeWindowIntoColumn" }
  | { type: "ExpelWindowFromColumn" }
  | { type: "SwapWindowRight" }
  | { type: "SwapWindowLeft" }
  | { type: "ToggleColumnTabbedDisplay" }
  | { type: "SetColumnDisplay"; display: "Default" | "Stack" | "Tabbed" }
  | { type: "CenterColumn" }
  | { type: "CenterWindow"; id?: number }
  | { type: "CenterVisibleColumns" }
  | { type: "FocusWorkspaceDown" }
  | { type: "FocusWorkspaceUp" }
  | { type: "FocusWorkspace"; reference: WorkspaceReference }
  | { type: "FocusWorkspacePrevious" }
  | { type: "MoveWindowToWorkspaceDown"; focus: boolean }
  | { type: "MoveWindowToWorkspaceUp"; focus: boolean }
  | {
      type: "MoveWindowToWorkspace"
      windowId?: number
      reference: WorkspaceReference
      focus: boolean
    }
  | { type: "MoveColumnToWorkspaceDown"; focus: boolean }
  | { type: "MoveColumnToWorkspaceUp"; focus: boolean }
  | { type: "MoveColumnToWorkspace"; reference: WorkspaceReference; focus: boolean }
  | { type: "MoveWorkspaceDown" }
  | { type: "MoveWorkspaceUp" }
  | { type: "SetWorkspaceName"; name: string; workspace?: WorkspaceReference }
  | { type: "UnsetWorkspaceName"; reference?: WorkspaceReference }
  | { type: "FocusMonitorLeft" }
  | { type: "FocusMonitorRight" }
  | { type: "FocusMonitorDown" }
  | { type: "FocusMonitorUp" }
  | { type: "FocusMonitorPrevious" }
  | { type: "FocusMonitorNext" }
  | { type: "FocusMonitor"; output: string }
  | { type: "MoveWindowToMonitorLeft" }
  | { type: "MoveWindowToMonitorRight" }
  | { type: "MoveWindowToMonitorDown" }
  | { type: "MoveWindowToMonitorUp" }
  | { type: "MoveWindowToMonitorPrevious" }
  | { type: "MoveWindowToMonitorNext" }
  | { type: "MoveWindowToMonitor"; id?: number; output: string }
  | { type: "MoveColumnToMonitorLeft" }
  | { type: "MoveColumnToMonitorRight" }
  | { type: "MoveColumnToMonitorDown" }
  | { type: "MoveColumnToMonitorUp" }
  | { type: "MoveColumnToMonitorPrevious" }
  | { type: "MoveColumnToMonitorNext" }
  | { type: "MoveColumnToMonitor"; output: string }
  | { type: "SetWindowWidth"; id?: number; change: SizeChange }
  | { type: "SetWindowHeight"; id?: number; change: SizeChange }
  | { type: "ResetWindowHeight"; id?: number }
  | { type: "SwitchPresetColumnWidth" }
  | { type: "SwitchPresetColumnWidthBack" }
  | { type: "SwitchPresetWindowWidth"; id?: number }
  | { type: "SwitchPresetWindowWidthBack"; id?: number }
  | { type: "SwitchPresetWindowHeight"; id?: number }
  | { type: "SwitchPresetWindowHeightBack"; id?: number }
  | { type: "MaximizeColumn" }
  | { type: "MaximizeWindowToEdges"; id?: number }
  | { type: "SetColumnWidth"; change: SizeChange }
  | { type: "ExpandColumnToAvailableWidth" }
  | { type: "SwitchLayout"; layout: "Spiral" | "Horizontal" | "Vertical" | "Tabbed" }
  | { type: "ShowHotkeyOverlay" }
  | { type: "MoveWorkspaceToMonitorLeft" }
  | { type: "MoveWorkspaceToMonitorRight" }
  | { type: "MoveWorkspaceToMonitorDown" }
  | { type: "MoveWorkspaceToMonitorUp" }
  | { type: "MoveWorkspaceToMonitorPrevious" }
  | { type: "MoveWorkspaceToIndex"; index: number; reference?: WorkspaceReference }
  | { type: "MoveWorkspaceToMonitor"; output: string; reference?: WorkspaceReference }
  | { type: "MoveWorkspaceToMonitorNext" }
  | { type: "ToggleDebugTint" }
  | { type: "DebugToggleOpaqueRegions" }
  | { type: "DebugToggleDamage" }
  | { type: "ToggleWindowFloating"; id?: number }
  | { type: "MoveWindowToFloating"; id?: number }
  | { type: "MoveWindowToTiling"; id?: number }
  | { type: "FocusFloating" }
  | { type: "FocusTiling" }
  | { type: "SwitchFocusBetweenFloatingAndTiling" }
  | { type: "MoveFloatingWindow"; id: number; x: number; y: number }
  | { type: "ToggleWindowRuleOpacity"; id?: number }
  | { type: "SetDynamicCastWindow"; id?: number }
  | { type: "SetDynamicCastMonitor"; output?: string }
  | { type: "ClearDynamicCastTarget" }
  | { type: "StopCast"; sessionId: number }
  | { type: "ToggleOverview" }
  | { type: "OpenOverview" }
  | { type: "CloseOverview" }
  | { type: "ToggleWindowUrgent"; id: number }
  | { type: "SetWindowUrgent"; id: number }
  | { type: "UnsetWindowUrgent"; id: number }
  | { type: "LoadConfigFile"; path?: string }

// Supporting Types
export type SizeChange = { type: "Set"; value: number } | { type: "Adjust"; value: number }

export type WorkspaceReference =
  | { type: "Index"; index: number }
  | { type: "Id"; id: number }
  | { type: "Name"; name: string }
  | WorkspaceDirection

export type WorkspaceDirection = "Left" | "Right" | "Previous" | "Next" | "First" | "Last"

export type Reply = { Ok: ResponseWire } | { Err: string }

export type Response =
  | { type: "Handled" }
  | { type: "Version"; version: string }
  | { type: "Outputs"; outputs: Record<string, Output> }
  | { type: "Workspaces"; workspaces: Workspace[] }
  | { type: "Windows"; windows: Window[] }
  | { type: "Layers"; layers: LayerSurface[] }
  | { type: "KeyboardLayouts"; layouts: KeyboardLayouts }
  | { type: "FocusedOutput"; output: Output | null }
  | { type: "FocusedWindow"; window: Window | null }
  | { type: "PickedWindow"; window: Window | null }
  | { type: "PickedColor"; color: PickedColor | null }
  | { type: "OutputConfigChanged"; result: OutputConfigChanged }
  | { type: "OverviewState"; overview: Overview }
  | { type: "Casts"; casts: Cast[] }

// Data Structures
export interface Window {
  id: number
  title: string
  appId: string
  pid?: number
  workspaceId?: number
  isFocused: boolean
  isFloating: boolean
  isUrgent: boolean
  layout: WindowLayout
  focusTimestamp?: Timestamp
}

export interface Workspace {
  id: number
  idx: number
  name?: string
  output: string
  is_active: boolean
  active_window_id?: number
}

export interface Output {
  name: string
  make?: string
  model?: string
  serial?: string
  description?: string
  physical_width: number
  physical_height: number
  modes: Mode[]
  current_mode: Mode
  preferred_mode?: Mode
  transform: Transform
  scale: number
  adaptive_sync: boolean
  vrr_supported: boolean
  logical: LogicalOutput
}

export interface LayerSurface {
  namespace: string
  output: string
  layer: Layer
  keyboardInteractivity: LayerSurfaceKeyboardInteractivity
}

export interface Cast {
  sessionId: string
  windowId?: number
  output?: string
  kind: CastKind
  target: CastTarget
}

export interface Overview {
  isOpen: boolean
}

export interface PickedColor {
  rgb: [number, number, number]
}

export interface WindowLayout {
  pos_in_scrolling_layout: [number, number] | null
  tile_size: [number, number]
  window_size: [number, number]
  tile_pos_in_workspace_view: [number, number] | null
  window_offset_in_tile: [number, number]
}

export interface Mode {
  width: number
  height: number
  refresh: number
  is_preferred: boolean
}

export interface LogicalOutput {
  x: number
  y: number
  width: number
  height: number
  scale: number
  transform: Transform
}

export interface KeyboardLayouts {
  names: string[]
  current_index: number
}

export interface Timestamp {
  secs: number
  nanos: number
}

export type OutputAction =
  | { type: "Disable" }
  | { type: "Enable"; mode?: Mode }
  | { type: "Mode"; mode: Mode }
  | { type: "Scale"; scale: number }
  | { type: "Transform"; transform: Transform }
  | { type: "Position"; x: number; y: number }
  | { type: "AdaptiveSync"; enable: boolean }

export type OutputConfigChanged = "Applied" | "OutputWasMissing"

export type Layer = "Background" | "Bottom" | "Top" | "Overlay"
export type LayerSurfaceKeyboardInteractivity = "None" | "Exclusive" | "OnDemand"
export type Transform =
  | "Normal"
  | "Rotate90"
  | "Rotate180"
  | "Rotate270"
  | "Flipped"
  | "Flipped90"
  | "Flipped180"
  | "Flipped270"
export type CastKind = "Output" | "Window"
export type CastTarget = "Output" | "Window"

// Event Stream Types
export type Event =
  // Workspace
  | { type: "WorkspacesChanged"; workspaces: Workspace[] }
  | { type: "WorkspaceUrgencyChanged"; id: number; urgent: boolean }
  | { type: "WorkspaceActivated"; id: number; focused: boolean }
  | { type: "WorkspaceActiveWindowChanged"; workspace_id: number; active_window_id?: number }
  // Window
  | { type: "WindowsChanged"; windows: Window[] }
  | { type: "WindowOpenedOrChanged"; window: Window }
  | { type: "WindowClosed"; id: number }
  | { type: "WindowFocusChanged"; id: number }
  | { type: "WindowFocusTimestampChanged"; id: number; focus_timestamp: Timestamp }
  | { type: "WindowMoved"; id: number; workspaceId: number }
  | { type: "WindowUrgencyChanged"; id: number; urgent: boolean }
  | { type: "WindowLayoutsChanged"; changes: [number, WindowLayout][] }
  // System & Devices
  | { type: "KeyboardLayoutsChanged"; keyboard_layouts: KeyboardLayouts }
  | { type: "KeyboardLayoutSwitched"; idx: number }
  | { type: "ConfigLoaded"; failed: boolean }
  | { type: "ScreenshotCaptured"; path?: string }
  | { type: "OutputsChanged"; outputs: Record<string, Output> }
  | { type: "OverviewOpenedOrClosed"; is_open: boolean }
  // Screencasts
  | { type: "CastsChanged"; casts: Cast[] }
  | { type: "CastStartedOrChanged"; cast: Cast }
  | { type: "CastStopped"; stream_id: number }

export type EventType = Event["type"]

// Type gymnastics: map Request type → Response type
type RequestToResponseType = {
  Version: "Version"
  Outputs: "Outputs"
  Workspaces: "Workspaces"
  Windows: "Windows"
  Layers: "Layers"
  KeyboardLayouts: "KeyboardLayouts"
  FocusedOutput: "FocusedOutput"
  FocusedWindow: "FocusedWindow"
  PickWindow: "PickedWindow"
  PickColor: "PickedColor"
  Action: "Handled"
  Output: "OutputConfigChanged"
  EventStream: never
  ReturnError: never
  OverviewState: "OverviewState"
  Casts: "Casts"
}

type ResponseTypeForRequest<R extends Request> = RequestToResponseType[R["type"]]

export type ResponseFor<R extends Request> =
  ResponseTypeForRequest<R> extends keyof ResponseMap
    ? ResponseTypeForRequest<R> extends "FocusedWindow"
      ? NonNullable<ResponseMap[ResponseTypeForRequest<R>]>
      : ResponseMap[ResponseTypeForRequest<R>]
    : never

// Transform: map Response type string → its payload value type
// e.g. ResponseMap["FocusedWindow"] = Window | null
//      ResponseMap["Windows"]       = Window[]
//      ResponseMap["Handled"]        = undefined
type ResponsePayload<R extends Response> =
  Omit<R, "type"> extends infer P ? (keyof P extends never ? undefined : P[keyof P]) : never

export type ResponseMap = {
  [R in Response as R["type"]]: ResponsePayload<R>
}

export type ResponseWire = {
  [R in Response as R["type"]]: Omit<R, "type">
}[Response["type"]]
