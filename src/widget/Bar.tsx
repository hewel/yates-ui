import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import Pango from "gi://Pango"
import { createPoll } from "ags/time"
import WorkspaceDots from "./bar/WorkspaceDots"
import { barState, getWorkspaceDots } from "./bar/state"

import {
  bar,
  content,
  leading,
  windowTitle,
  dateLabel,
  metaLabel,
} from "./Bar.css"

const dateValue = createPoll("", 1000, () => {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
})

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
      <centerbox class={content} hexpand>
        <box
          $type="start"
          class={leading}
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={12}
          halign={Gtk.Align.START}
        >
          <WorkspaceDots dots={barState(getWorkspaceDots)} />
          <label
            class={windowTitle}
            visible={barState((state) => state.activeWindowTitle.length > 0)}
            wrap={false}
            ellipsize={Pango.EllipsizeMode.END}
            xalign={0}
            maxWidthChars={36}
            label={barState((state) => state.activeWindowTitle)}
          />
        </box>

        <label
          $type="center"
          class={dateLabel}
          xalign={0.5}
          label={dateValue}
        />

        <label
          $type="end"
          class={metaLabel}
          xalign={1}
          label={barState((state) => state.keyboardLayout)}
        />
      </centerbox>
    </window>
  )
}
