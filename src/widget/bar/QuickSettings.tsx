import Gtk from "gi://Gtk?version=4.0"

import { BarOrientation } from "../../settings/appSettingsModel"
import {
  quickSettingsChoice,
  quickSettingsFooterButton,
  quickSettingsPanel,
} from "./QuickSettings.css"

export interface QuickSettingsHandle {
  show(): void
  hide(): void
  visible(): boolean
}

export interface QuickSettingsOptions {
  readonly orientation: BarOrientation
  readonly setBarOrientation: (orientation: BarOrientation) => void
  readonly openSettings: () => void
  readonly onReady: (handle: QuickSettingsHandle) => void
}

export function QuickSettings(options: QuickSettingsOptions) {
  let popover: Gtk.Popover | null = null
  let verticalOption: Gtk.ToggleButton | null = null

  return (
    <Gtk.Popover
      autohide={true}
      hasArrow={false}
      $={(self: Gtk.Popover) => {
        popover = self
        options.onReady({
          show: () => self.popup(),
          hide: () => self.popdown(),
          visible: () => self.visible,
        })
      }}
    >
      <Gtk.Box class={quickSettingsPanel} orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <Gtk.Label class="heading" label="Bar Orientation" xalign={0} />
        <Gtk.Box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} homogeneous={true}>
          <Gtk.ToggleButton
            class={quickSettingsChoice}
            label="Vertical"
            active={options.orientation === "vertical"}
            onToggled={(self) => {
              if (self.active) options.setBarOrientation("vertical")
            }}
            $={(self: Gtk.ToggleButton) => {
              verticalOption = self
            }}
          />
          <Gtk.ToggleButton
            class={quickSettingsChoice}
            label="Horizontal"
            active={options.orientation === "horizontal"}
            onToggled={(self) => {
              if (self.active) options.setBarOrientation("horizontal")
            }}
            $={(self: Gtk.ToggleButton) => {
              self.set_group(verticalOption)
            }}
          />
        </Gtk.Box>
        <Gtk.Separator orientation={Gtk.Orientation.HORIZONTAL} />
        <Gtk.Box halign={Gtk.Align.END}>
          <Gtk.Button
            class={`${quickSettingsFooterButton} flat`}
            iconName="preferences-system-symbolic"
            tooltipText="Settings"
            onClicked={() => {
              popover?.popdown()
              options.openSettings()
            }}
            $={(self: Gtk.Button) => {
              self.update_property([Gtk.AccessibleProperty.LABEL], ["Settings"])
            }}
          />
        </Gtk.Box>
      </Gtk.Box>
    </Gtk.Popover>
  )
}
