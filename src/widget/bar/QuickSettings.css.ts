import { globalStyle, style } from "@vanilla-extract/css"

const shellBackground = "#282828"
const controlBackground = "#404040"
const arrowBackground = "#4f4f4f"
const controlHover = "#4b4b4b"
const controlPressed = "#565656"
const activeBackground = "#3584e4"
const activeArrowBackground = "#458ee6"
const activeHover = "#4990e7"
const foreground = "#ffffff"
const dimForeground = "#d0d0d0"

const focus = {
  outline: "2px solid #78aeed",
  outlineOffset: "2px",
}

export const quickSettingsTrigger = style({
  minHeight: "32px",
  padding: "0",
  border: "none",
  backgroundColor: "transparent",
  color: foreground,
})

export const quickSettingsTriggerVertical = style({
  minWidth: "32px",
})

// Gtk.MenuButton owns a nested button.toggle node. Interactive state belongs
// to that node, so styling only the menubutton root leaks the GTK theme accent.
globalStyle(`${quickSettingsTrigger} > button.toggle`, {
  minHeight: "32px",
  padding: "0 10px",
  border: "none",
  borderRadius: "16px",
  backgroundImage: "none",
  backgroundColor: "transparent",
  boxShadow: "none",
  color: foreground,
  outline: "none",
})

globalStyle(`${quickSettingsTrigger} > button.toggle:hover`, {
  backgroundImage: "none",
  backgroundColor: "rgba(255, 255, 255, 0.10)",
  boxShadow: "none",
})

globalStyle(`${quickSettingsTrigger} > button.toggle:active`, {
  backgroundImage: "none",
  backgroundColor: "rgba(255, 255, 255, 0.14)",
  boxShadow: "none",
})

globalStyle(`${quickSettingsTrigger} > button.toggle:checked`, {
  backgroundImage: "none",
  backgroundColor: "#3d3d3d",
  boxShadow: "none",
  color: foreground,
})

globalStyle(`${quickSettingsTrigger} > button.toggle:checked:hover`, {
  backgroundImage: "none",
  backgroundColor: "#484848",
})

globalStyle(`${quickSettingsTrigger} > button.toggle:checked:active`, {
  backgroundImage: "none",
  backgroundColor: "#505050",
  boxShadow: "none",
})

globalStyle(`${quickSettingsTrigger} > button.toggle:focus-visible`, {
  outline: "none",
  boxShadow: "inset 0 0 0 2px rgba(255, 255, 255, 0.28)",
})

globalStyle(`${quickSettingsTriggerVertical} > button.toggle`, {
  minWidth: "32px",
  minHeight: "40px",
  padding: "3px 0",
  borderRadius: "16px",
})

export const quickSettingsPopover = style({
  backgroundColor: "transparent",
  boxShadow: "none",
})

globalStyle(`${quickSettingsPopover} contents`, {
  padding: "0",
  border: "none",
  backgroundColor: "transparent",
  boxShadow: "none",
})

export const quickSettingsPanel = style({
  minWidth: "376px",
  padding: "16px",
  borderRadius: "28px",
  backgroundColor: shellBackground,
  boxShadow: "0 4px 18px rgba(0, 0, 0, 0.35)",
  color: foreground,
})

export const quickSettingsMain = style({ minWidth: "376px" })

export const quickSettingsSection = style({
  opacity: 1,
  transition: "opacity 160ms cubic-bezier(0.2, 0, 0, 1)",
})

export const quickSettingsSectionDimmed = style({ opacity: 0.46 })

export const quickSettingsTopRow = style({ minHeight: "40px" })

export const quickSettingsActionGroup = style({ minHeight: "40px" })

export const quickSettingsSubtitle = style({
  color: dimForeground,
  fontSize: "11px",
})

export const quickSettingsBattery = style({
  minHeight: "40px",
  padding: "0 14px",
  borderRadius: "20px",
  backgroundColor: controlBackground,
  color: foreground,
})

export const quickSettingsBatteryValue = style({
  fontWeight: "700",
})

export const quickSettingsAction = style({
  minWidth: "40px",
  minHeight: "40px",
  padding: "0",
  borderRadius: "20px",
  backgroundColor: controlBackground,
  color: foreground,
  ":hover": { backgroundColor: controlHover },
  ":active": { backgroundColor: controlPressed },
  ":focus-visible": focus,
})

export const quickSettingsSlider = style({
  minHeight: "40px",
  color: activeBackground,
  ":focus-visible": focus,
})

globalStyle(`${quickSettingsSlider} trough`, {
  minHeight: "4px",
  borderRadius: "2px",
  backgroundImage: "none",
  backgroundColor: "#777777",
})

globalStyle(`${quickSettingsSlider} highlight`, {
  minHeight: "4px",
  borderRadius: "2px",
  backgroundImage: "none",
  backgroundColor: activeBackground,
})

globalStyle(`${quickSettingsSlider} slider`, {
  minWidth: "16px",
  minHeight: "16px",
  borderRadius: "8px",
  backgroundColor: "#c2c2c2",
  boxShadow: "none",
})

export const quickSettingsTileRows = style({ minWidth: "376px" })

export const quickSettingsTileRow = style({ minHeight: "48px" })

export const quickSettingsTilePlaceholder = style({
  minWidth: "0",
  minHeight: "48px",
  padding: "0",
  backgroundColor: "transparent",
  boxShadow: "none",
})

globalStyle(`${quickSettingsTilePlaceholder}:hover`, {
  backgroundColor: "rgba(255, 255, 255, 0.05)",
})

export const quickSettingsInlineDetail = style({
  padding: "10px 0 4px",
  borderRadius: "20px",
  backgroundColor: "#353535",
})

export const quickSettingsExpandedHeader = style({
  minHeight: "48px",
  padding: "0 10px",
})

export const quickSettingsExpandedToggle = style({
  minWidth: "48px",
  minHeight: "48px",
  padding: "0",
  borderRadius: "24px",
  backgroundColor: controlBackground,
  color: foreground,
  ":checked": { backgroundColor: activeBackground },
  ":hover": { backgroundColor: controlHover },
  ":focus-visible": focus,
})

export const quickSettingsExpandedTitle = style({
  color: foreground,
  fontSize: "18px",
  fontWeight: "700",
})

export const quickSettingsSettingsLink = style({
  minHeight: "44px",
  margin: "4px 8px 8px",
  padding: "0 12px",
  border: "none",
  borderRadius: "12px",
  backgroundImage: "none",
  backgroundColor: "transparent",
  boxShadow: "none",
  color: foreground,
  ":hover": { backgroundColor: "rgba(255, 255, 255, 0.07)" },
  ":active": { backgroundColor: "rgba(255, 255, 255, 0.13)" },
  ":focus-visible": focus,
})

export const quickSettingsSettingsSeparator = style({
  margin: "0 8px",
  backgroundColor: "rgba(255, 255, 255, 0.08)",
})

export const quickSettingsExtension = style({
  paddingTop: "12px",
  borderTop: "1px solid rgba(255, 255, 255, 0.10)",
  backgroundColor: "transparent",
  color: foreground,
})

export const quickSettingsTilePrimary = style({
  minWidth: "0",
  minHeight: "48px",
  padding: "0 12px",
  borderRadius: "24px",
  backgroundColor: controlBackground,
  color: foreground,
  ":hover": { backgroundColor: controlHover },
  ":active": { backgroundColor: controlPressed },
  ":checked": {
    backgroundColor: activeBackground,
    color: foreground,
  },
  selectors: {
    "&:checked:hover": {
      backgroundColor: activeHover,
    },
  },
  ":focus-visible": focus,
})

export const quickSettingsSplitTile = style({
  minWidth: "0",
  minHeight: "48px",
  borderRadius: "24px",
  backgroundColor: controlBackground,
})

export const quickSettingsSplitTilePrimary = style({
  minWidth: "0",
  minHeight: "48px",
  padding: "0 12px",
  borderRadius: "24px 0 0 24px",
  backgroundColor: "transparent",
  color: foreground,
  ":hover": { backgroundColor: controlHover },
  ":checked": {
    backgroundColor: activeBackground,
    color: foreground,
  },
  selectors: {
    "&:checked:hover": {
      backgroundColor: activeHover,
    },
  },
  ":focus-visible": focus,
})

export const quickSettingsSplitTileArrow = style({
  minWidth: "36px",
  minHeight: "48px",
  padding: "0",
  borderRadius: "0 24px 24px 0",
  backgroundColor: arrowBackground,
  color: foreground,
  ":hover": { backgroundColor: controlHover },
  ":active": { backgroundColor: controlPressed },
  selectors: {
    "&.active": { backgroundColor: activeArrowBackground },
    "&.active:hover": { backgroundColor: activeHover },
  },
  ":focus-visible": focus,
})

export const quickSettingsTileIcon = style({ minWidth: "20px" })

export const quickSettingsTileText = style({
  minWidth: "0",
  minHeight: "32px",
})

export const quickSettingsTileLabel = style({
  color: foreground,
  fontSize: "14px",
  fontWeight: "700",
})

export const quickSettingsList = style({
  padding: "6px",
  backgroundColor: "transparent",
  border: "none",
})

export const quickSettingsScroller = style({
  backgroundColor: "transparent",
  border: "none",
})

export const quickSettingsDetailRow = style({
  minHeight: "48px",
  padding: "4px 12px",
  borderRadius: "12px",
  backgroundColor: "transparent",
  color: foreground,
  ":hover": { backgroundColor: controlBackground },
  selectors: {
    "&.active": {
      backgroundColor: "transparent",
    },
  },
  ":focus-visible": focus,
})

export const quickSettingsIcon = style({ minWidth: "20px" })

export const quickSettingsEmptyState = style({
  minHeight: "96px",
  padding: "16px 28px",
  color: dimForeground,
  fontSize: "15px",
  fontWeight: "700",
})

export const quickSettingsChoice = style({
  minHeight: "44px",
  padding: "8px 12px",
  borderRadius: "22px",
  backgroundColor: controlBackground,
  color: foreground,
  ":hover": { backgroundColor: controlHover },
  ":checked": { backgroundColor: activeBackground },
  ":focus-visible": focus,
})

export const quickSettingsFooterButton = style({
  minWidth: "40px",
  minHeight: "40px",
  padding: "0",
  borderRadius: "20px",
  color: foreground,
  ":hover": { backgroundColor: controlHover },
  ":focus-visible": focus,
})

export const quickSettingsError = style({
  color: "@error_color",
  fontSize: "12px",
})
