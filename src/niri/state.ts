import { Either, Schema } from "effect"

const Point = Schema.Tuple(Schema.Number, Schema.Number)

export class NiriWorkspace extends Schema.Class<NiriWorkspace>("NiriWorkspace")({
  id: Schema.Number,
  idx: Schema.Number,
  name: Schema.NullOr(Schema.String),
  output: Schema.NullOr(Schema.String),
  is_urgent: Schema.Boolean,
  is_active: Schema.Boolean,
  is_focused: Schema.Boolean,
  active_window_id: Schema.NullOr(Schema.Number),
}) {}

export class NiriWindowLayout extends Schema.Class<NiriWindowLayout>("NiriWindowLayout")({
  pos_in_scrolling_layout: Schema.optional(Schema.NullOr(Point)),
  tile_size: Schema.optional(Point),
  window_size: Schema.optional(Point),
  tile_pos_in_workspace_view: Schema.optional(Schema.NullOr(Point)),
  window_offset_in_tile: Schema.optional(Point),
}) {}

export class NiriWindow extends Schema.Class<NiriWindow>("NiriWindow")({
  id: Schema.Number,
  title: Schema.NullOr(Schema.String),
  app_id: Schema.NullOr(Schema.String),
  pid: Schema.optional(Schema.NullOr(Schema.Number)),
  workspace_id: Schema.NullOr(Schema.Number),
  is_focused: Schema.Boolean,
  is_floating: Schema.Boolean,
  is_urgent: Schema.Boolean,
  layout: Schema.optional(Schema.NullOr(NiriWindowLayout)),
}) {}

const WorkspacesChanged = Schema.Struct({
  WorkspacesChanged: Schema.Struct({ workspaces: Schema.Array(NiriWorkspace) }),
})
const WorkspaceActivated = Schema.Struct({
  WorkspaceActivated: Schema.Struct({
    id: Schema.Number,
    focused: Schema.Boolean,
  }),
})
const WorkspaceActiveWindowChanged = Schema.Struct({
  WorkspaceActiveWindowChanged: Schema.Struct({
    workspace_id: Schema.Number,
    active_window_id: Schema.NullOr(Schema.Number),
  }),
})
const WindowsChanged = Schema.Struct({
  WindowsChanged: Schema.Struct({ windows: Schema.Array(NiriWindow) }),
})
const WindowOpenedOrChanged = Schema.Struct({
  WindowOpenedOrChanged: Schema.Struct({ window: NiriWindow }),
})
const WindowClosed = Schema.Struct({
  WindowClosed: Schema.Struct({ id: Schema.Number }),
})
const WindowFocusChanged = Schema.Struct({
  WindowFocusChanged: Schema.Struct({ id: Schema.NullOr(Schema.Number) }),
})

const KnownEvent = Schema.Union(
  WorkspacesChanged,
  WorkspaceActivated,
  WorkspaceActiveWindowChanged,
  WindowsChanged,
  WindowOpenedOrChanged,
  WindowClosed,
  WindowFocusChanged,
)

type KnownEvent = typeof KnownEvent.Type

export interface NiriState {
  readonly workspaces: ReadonlyArray<NiriWorkspace>
  readonly windows: ReadonlyArray<NiriWindow>
  readonly focusedWorkspaceId: number | null
  readonly focusedWindowId: number | null
  readonly sequence: number
}

export const initialNiriState: NiriState = {
  workspaces: [],
  windows: [],
  focusedWorkspaceId: null,
  focusedWindowId: null,
  sequence: 0,
}

export type ApplyEventResult =
  | { readonly outcome: "applied"; readonly state: NiriState }
  | { readonly outcome: "ignored"; readonly state: NiriState }
  | { readonly outcome: "invalid"; readonly state: NiriState; readonly error: string }

const decodeKnownEvent = Schema.decodeUnknownEither(KnownEvent)
const decodeRecord = Schema.decodeUnknownEither(
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
)

function replaceWindow(
  windows: ReadonlyArray<NiriWindow>,
  incoming: NiriWindow,
): ReadonlyArray<NiriWindow> {
  const existing = windows.findIndex((window) => window.id === incoming.id)
  if (existing < 0) return [...windows, incoming]
  return windows.map((window) => (window.id === incoming.id ? incoming : window))
}

function reduceKnownEvent(state: NiriState, event: KnownEvent): NiriState {
  const sequence = state.sequence + 1

  if ("WorkspacesChanged" in event) {
    const workspaces = event.WorkspacesChanged.workspaces
    return {
      ...state,
      workspaces,
      focusedWorkspaceId: workspaces.find((workspace) => workspace.is_focused)?.id ?? null,
      sequence,
    }
  }
  if ("WorkspaceActivated" in event) {
    const { id, focused } = event.WorkspaceActivated
    const output = state.workspaces.find((workspace) => workspace.id === id)?.output
    return {
      ...state,
      workspaces: state.workspaces.map((workspace) => ({
        ...workspace,
        is_active:
          workspace.id === id ? true : workspace.output === output ? false : workspace.is_active,
        is_focused: focused ? workspace.id === id : workspace.is_focused,
      })),
      focusedWorkspaceId: focused ? id : state.focusedWorkspaceId,
      sequence,
    }
  }
  if ("WorkspaceActiveWindowChanged" in event) {
    const { workspace_id, active_window_id } = event.WorkspaceActiveWindowChanged
    return {
      ...state,
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === workspace_id ? { ...workspace, active_window_id } : workspace,
      ),
      sequence,
    }
  }
  if ("WindowsChanged" in event) {
    const windows = event.WindowsChanged.windows
    return {
      ...state,
      windows,
      focusedWindowId: windows.find((window) => window.is_focused)?.id ?? null,
      sequence,
    }
  }
  if ("WindowOpenedOrChanged" in event) {
    const incoming = event.WindowOpenedOrChanged.window
    return {
      ...state,
      windows: replaceWindow(state.windows, incoming),
      focusedWindowId: incoming.is_focused ? incoming.id : state.focusedWindowId,
      sequence,
    }
  }
  if ("WindowClosed" in event) {
    const id = event.WindowClosed.id
    return {
      ...state,
      windows: state.windows.filter((window) => window.id !== id),
      focusedWindowId: state.focusedWindowId === id ? null : state.focusedWindowId,
      sequence,
    }
  }

  return {
    ...state,
    focusedWindowId: event.WindowFocusChanged.id,
    windows: state.windows.map((window) => ({
      ...window,
      is_focused: window.id === event.WindowFocusChanged.id,
    })),
    sequence,
  }
}

export function applyNiriEventLine(state: NiriState, line: string): ApplyEventResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch (cause) {
    return { outcome: "invalid", state, error: String(cause) }
  }

  const decoded = decodeKnownEvent(parsed)
  if (Either.isRight(decoded)) {
    return { outcome: "applied", state: reduceKnownEvent(state, decoded.right) }
  }

  const record = decodeRecord(parsed)
  if (Either.isRight(record)) {
    const keys = Object.keys(record.right)
    if (keys.length === 1 && !knownEventNames.has(keys[0])) {
      return { outcome: "ignored", state }
    }
  }

  return { outcome: "invalid", state, error: String(decoded.left) }
}

const knownEventNames = new Set([
  "WorkspacesChanged",
  "WorkspaceActivated",
  "WorkspaceActiveWindowChanged",
  "WindowsChanged",
  "WindowOpenedOrChanged",
  "WindowClosed",
  "WindowFocusChanged",
])

export function focusWorkspaceRequest(workspaceId: number): string {
  return JSON.stringify({
    Action: { FocusWorkspace: { reference: { Id: workspaceId } } },
  })
}

export function focusWindowRequest(windowId: number): string {
  return JSON.stringify({
    Action: { FocusWindow: { id: windowId } },
  })
}
