import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"

import style from "virtual:vanilla-bundle-url"

import Bar from "./widget/Bar"

const BAR_ORIENTATION = "vertical"

const app = new Gtk.Application({ application_id: "me.pigmint.yates-ui" })

function loadCss(display: Gdk.Display) {
  if (!style) return

  const provider = new Gtk.CssProvider()
  provider.connect("parsing-error", (_provider, _section, error) => {
    console.warn(`CSS parsing error: ${error.message}`)
  })
  provider.load_from_path(style)
  Gtk.StyleContext.add_provider_for_display(
    display,
    provider,
    // above USER (800) so the bar's look is not overridden by ~/.config/gtk-4.0/gtk.css themes
    Gtk.STYLE_PROVIDER_PRIORITY_USER + 1,
  )
}

app.connect("activate", () => {
  const display = Gdk.Display.get_default()
  if (!display) return

  loadCss(display)

  const monitors = display.get_monitors()
  for (let i = 0; i < monitors.get_n_items(); i++) {
    const monitor = monitors.get_item(i)
    if (monitor instanceof Gdk.Monitor) Bar(monitor, app, BAR_ORIENTATION)
  }
})

app.run([])
