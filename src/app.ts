import app from "ags/gtk4/app"

import style from "virtual:vanilla-bundle-url"

import Bar from "./widget/Bar"

app.start({
  css: style,
  main() {
    app.get_monitors().map(Bar)
  },
})
