export type Workspace = {
  id: number
  idx: number
  name: string | null
  is_active: boolean
  active_window_id: number | null
}

export type Window = {
  id: number
  title: string
  app_id?: string
  is_focused: boolean
}

export type BarState = {
  activeWindowTitle: string
  activeApp: string
  keyboardLayout: string
  activeWorkspaceId: number | null
  workspacesById: Record<number, Workspace>
  activeWindowId: number | null
  windowsById: Record<number, Window>
}

export type WorkspaceDot = Workspace & {
  isActive: boolean
}

export const emptyState: BarState = {
  activeWindowTitle: "",
  activeApp: "",
  keyboardLayout: "",
  activeWorkspaceId: null,
  workspacesById: {},
  activeWindowId: null,
  windowsById: {},
}
