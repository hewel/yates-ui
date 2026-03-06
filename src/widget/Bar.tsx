import Pango from "gi://Pango"

import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { createPoll } from "ags/time"

import { createBinding, createComputed } from "ags"
import { format } from "date-fns"
import { NiriService } from "src/lib/niri"

import { bar, content, leading, windowTitle, dateLabel, metaLabel } from "./Bar.css"


const dateValue = createPoll("", 1000, () => {
  return format(new Date(), "EEE hh:mm")
})

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  const niri = NiriService.get_default()
  const focused = createBinding(niri, "focusedWindow")
  const title = createComputed(() => focused().title ?? "")

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
          <label
            class={windowTitle}
            wrap={false}
            ellipsize={Pango.EllipsizeMode.END}
            xalign={0}
            maxWidthChars={36}
            label={title}
          />
        </box>

        <label $type="center" class={dateLabel} xalign={0.5} label={dateValue} />

        <label $type="end" class={metaLabel} xalign={1} />
      </centerbox>
    </window>
  )
}
