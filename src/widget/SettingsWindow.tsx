import Gtk from "gi://Gtk?version=4.0"

import { Accessor, createRoot } from "gnim"

import { BarOrientation } from "../settings/appSettingsModel"
import {
  orientationOption,
  settingsCard,
  settingsContent,
  settingsDescription,
  settingsLabel,
  settingsTitle,
  settingsWindow,
} from "./SettingsWindow.css"

function requireGtkWindow(value: unknown): Gtk.Window {
  if (value instanceof Gtk.Window) return value
  throw new Error("Gnim root did not construct a Gtk.Window")
}

export interface SettingsWindowOptions {
  readonly application: Gtk.Application
  readonly barOrientation: Accessor<BarOrientation>
  readonly setBarOrientation: (orientation: BarOrientation) => void
}

export interface SettingsWindowHandle {
  show(): void
  visible(): boolean
  destroy(): void
}

export function createSettingsWindow(options: SettingsWindowOptions): SettingsWindowHandle {
  let disposeRoot = () => {}
  let verticalOption: Gtk.CheckButton | null = null
  let horizontalOption: Gtk.CheckButton | null = null

  const window = requireGtkWindow(
    createRoot((dispose) => {
      disposeRoot = dispose
      return (
        <Gtk.Window
          application={options.application}
          name="settings"
          title="Yates UI Settings"
          class={settingsWindow}
          defaultWidth={320}
          defaultHeight={184}
          resizable={false}
          hideOnClose={true}
        >
          <Gtk.Box class={settingsContent} orientation={Gtk.Orientation.VERTICAL} spacing={16}>
            <Gtk.Label class={settingsTitle} label="Settings" xalign={0} />
            <Gtk.Box class={settingsCard} orientation={Gtk.Orientation.VERTICAL} spacing={6}>
              <Gtk.Label class={settingsLabel} label="Bar orientation" xalign={0} />
              <Gtk.Label
                class={settingsDescription}
                label="Choose how the bar is arranged on each output."
                xalign={0}
                wrap={true}
              />
              <Gtk.Box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} marginTop={8}>
                <Gtk.CheckButton
                  class={orientationOption}
                  label="Vertical"
                  active={options.barOrientation.as((orientation) => orientation === "vertical")}
                  onToggled={(self) => {
                    if (self.active) options.setBarOrientation("vertical")
                  }}
                  $={(self: Gtk.CheckButton) => {
                    verticalOption = self
                  }}
                />
                <Gtk.CheckButton
                  class={orientationOption}
                  label="Horizontal"
                  active={options.barOrientation.as((orientation) => orientation === "horizontal")}
                  onToggled={(self) => {
                    if (self.active) options.setBarOrientation("horizontal")
                  }}
                  $={(self: Gtk.CheckButton) => {
                    horizontalOption = self
                    self.set_group(verticalOption)
                  }}
                />
              </Gtk.Box>
            </Gtk.Box>
          </Gtk.Box>
        </Gtk.Window>
      )
    }),
  )

  return {
    show: () => {
      window.present()
      const selected =
        options.barOrientation.peek() === "vertical" ? verticalOption : horizontalOption
      selected?.grab_focus()
    },
    visible: () => window.visible,
    destroy: () => {
      window.destroy()
      disposeRoot()
    },
  }
}
