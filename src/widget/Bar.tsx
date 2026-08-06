import Astal from "gi://Astal"
import Niri from "gi://AstalNiri"
import Pango from "gi://Pango"

import { createPoll } from "ags/time"

import Gtk from "@girs/gtk-4.0"
import { format } from "date-fns"
import { createState, createComputed, createBinding } from "gnim"

import { bar, content, leading, windowTitle, dateLabel, metaLabel } from "./Bar.css"

const dateValue = createPoll("", 1000, () => {
  return format(new Date(), "EEE hh:mm")
})

export default function Bar() {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  const niri = Niri.get_default()
  const focused = createBinding(niri, "focusedWindow")
  const title = createComputed(() => focused().title ?? "")

  return (
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
      <Gtk.Label label={title} />
    </Gtk.Box>
  )
}
