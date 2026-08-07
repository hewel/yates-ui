import Gtk from "gi://Gtk?version=4.0"

import { Accessor, createRoot } from "gnim"

import { BarOrientation } from "../settings/appSettingsModel"

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
          defaultWidth={480}
          defaultHeight={180}
          resizable={false}
          hideOnClose={true}
        >
          <Gtk.HeaderBar $type="titlebar" showTitleButtons={true} />
          <Gtk.Box
            orientation={Gtk.Orientation.VERTICAL}
            marginTop={24}
            marginBottom={24}
            marginStart={24}
            marginEnd={24}
          >
            <Gtk.Label class="heading" label="Bar" xalign={0} marginBottom={8} />
            <Gtk.ListBox class="boxed-list" selectionMode={Gtk.SelectionMode.NONE}>
              <Gtk.ListBoxRow selectable={false} activatable={false}>
                <Gtk.Box
                  orientation={Gtk.Orientation.HORIZONTAL}
                  spacing={24}
                  marginTop={12}
                  marginBottom={12}
                  marginStart={12}
                  marginEnd={12}
                >
                  <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={3} hexpand={true}>
                    <Gtk.Label label="Orientation" xalign={0} />
                    <Gtk.Label
                      class="dim-label"
                      label="Choose how the bar is arranged on each output"
                      xalign={0}
                      wrap={true}
                    />
                  </Gtk.Box>
                  <Gtk.Box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    valign={Gtk.Align.CENTER}
                  >
                    <Gtk.CheckButton
                      label="Vertical"
                      active={options.barOrientation.as(
                        (orientation) => orientation === "vertical",
                      )}
                      onToggled={(self) => {
                        if (self.active) options.setBarOrientation("vertical")
                      }}
                      $={(self: Gtk.CheckButton) => {
                        verticalOption = self
                      }}
                    />
                    <Gtk.CheckButton
                      label="Horizontal"
                      active={options.barOrientation.as(
                        (orientation) => orientation === "horizontal",
                      )}
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
              </Gtk.ListBoxRow>
            </Gtk.ListBox>
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
