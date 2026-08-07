import { style } from "@vanilla-extract/css"

const focus = {
  outline: "2px solid @accent_color",
  outlineOffset: "2px",
}

export const quickSettingsTrigger = style({
  minHeight: "28px",
  padding: "2px 8px",
  border: "none",
  borderRadius: "9px",
  backgroundColor: "transparent",
  color: "@theme_fg_color",
  ":hover": { backgroundColor: "alpha(@theme_fg_color, 0.12)" },
  ":checked": { backgroundColor: "alpha(@theme_fg_color, 0.2)" },
  ":focus-visible": focus,
})

export const quickSettingsPanel = style({
  minWidth: "384px",
  padding: "16px",
  color: "@theme_fg_color",
})

export const quickSettingsMain = style({ minWidth: "352px" })

export const quickSettingsDetails = style({ minWidth: "352px" })

export const quickSettingsHeader = style({ minHeight: "40px" })

export const quickSettingsTitle = style({
  fontSize: "16px",
  fontWeight: "700",
})

export const quickSettingsSubtitle = style({
  color: "@insensitive_fg_color",
  fontSize: "12px",
})

export const quickSettingsBattery = style({
  minHeight: "32px",
  padding: "4px 9px",
  borderRadius: "16px",
  backgroundColor: "alpha(@theme_fg_color, 0.08)",
})

export const quickSettingsAction = style({
  minWidth: "40px",
  minHeight: "40px",
  padding: "8px",
  borderRadius: "20px",
  backgroundColor: "alpha(@theme_fg_color, 0.1)",
  ":hover": { backgroundColor: "alpha(@theme_fg_color, 0.18)" },
  ":focus-visible": focus,
})

export const quickSettingsSlider = style({
  minHeight: "40px",
  ":focus-visible": focus,
})

export const quickSettingsTileGrid = style({ minWidth: "352px" })

export const quickSettingsTilePrimary = style({
  minWidth: "0",
  minHeight: "92px",
  padding: "12px",
  borderRadius: "14px",
  backgroundColor: "alpha(@theme_fg_color, 0.1)",
  ":hover": { backgroundColor: "alpha(@theme_fg_color, 0.16)" },
  ":checked": {
    backgroundColor: "@accent_bg_color",
    color: "@accent_fg_color",
  },
  ":focus-visible": focus,
})

export const quickSettingsSplitTile = style({
  minWidth: "0",
  minHeight: "92px",
  borderRadius: "14px",
  backgroundColor: "alpha(@theme_fg_color, 0.1)",
})

export const quickSettingsSplitTilePrimary = style({
  minWidth: "0",
  minHeight: "92px",
  padding: "12px",
  borderRadius: "14px 0 0 14px",
  backgroundColor: "transparent",
  ":hover": { backgroundColor: "alpha(@theme_fg_color, 0.08)" },
  ":checked": {
    backgroundColor: "@accent_bg_color",
    color: "@accent_fg_color",
  },
  ":focus-visible": focus,
})

export const quickSettingsSplitTileArrow = style({
  minWidth: "40px",
  minHeight: "92px",
  padding: "8px",
  borderRadius: "0 14px 14px 0",
  borderLeft: "1px solid alpha(@theme_fg_color, 0.12)",
  backgroundColor: "transparent",
  ":hover": { backgroundColor: "alpha(@theme_fg_color, 0.12)" },
  ":focus-visible": focus,
})

export const quickSettingsTileIcon = style({ marginBottom: "1px" })

export const quickSettingsTileLabel = style({ fontWeight: "700" })

export const quickSettingsBackButton = style({
  minWidth: "40px",
  minHeight: "40px",
  padding: "8px",
  borderRadius: "20px",
  ":hover": { backgroundColor: "alpha(@theme_fg_color, 0.1)" },
  ":focus-visible": focus,
})

export const quickSettingsList = style({
  backgroundColor: "transparent",
  border: "none",
})

export const quickSettingsDetailRow = style({
  minHeight: "52px",
  padding: "8px 10px",
  borderRadius: "10px",
  backgroundColor: "transparent",
  ":hover": { backgroundColor: "alpha(@theme_fg_color, 0.1)" },
  selectors: {
    "&.active": {
      backgroundColor: "alpha(@accent_bg_color, 0.22)",
    },
  },
  ":focus-visible": focus,
})

export const quickSettingsIcon = style({ minWidth: "20px" })

export const quickSettingsChoice = style({
  minHeight: "44px",
  padding: "8px 12px",
  borderRadius: "12px",
  ":focus-visible": focus,
})

export const quickSettingsFooterButton = style({
  minWidth: "40px",
  minHeight: "40px",
  padding: "8px",
  borderRadius: "20px",
  ":focus-visible": focus,
})

export const quickSettingsError = style({
  color: "@error_color",
  fontSize: "12px",
})

export const quickSettingsConfirmation = style({ minHeight: "208px" })
