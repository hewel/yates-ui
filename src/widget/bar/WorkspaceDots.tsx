import { For, type Accessor } from "ags"
import { Gtk } from "ags/gtk4"
import { niri } from "../../lib/niri"
import {
  workspaceRail,
  workspaceButton,
  workspaceDot,
  workspaceDotActive,
} from "../Bar.css"
import { WorkspaceDot } from "./types"

type WorkspaceDotsProps = {
  dots: Accessor<WorkspaceDot[]>
}

export default function WorkspaceDots({ dots }: WorkspaceDotsProps) {
  return (
    <box class={workspaceRail} orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <For each={dots}>
        {(workspace: WorkspaceDot) => (
          <button class={workspaceButton} onClicked={() => niri.focusWorkspace(workspace.idx)}>
            <label
              class={`${workspaceDot} ${workspace.isActive ? workspaceDotActive : ""}`}
              label="●"
            />
          </button>
        )}
      </For>
    </box>
  )
}
