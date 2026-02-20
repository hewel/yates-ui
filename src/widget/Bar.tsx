import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import Pango from "gi://Pango"
import WorkspaceDots from "./bar/WorkspaceDots"
import { barState, getWorkspaceDots } from "./bar/state"

import {
  bar,
  content,
  windowTitle,
  metaLabel,
} from "./Bar.css"

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
        <WorkspaceDots dots={barState(getWorkspaceDots)} />
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
