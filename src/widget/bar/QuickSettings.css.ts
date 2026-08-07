import { style } from "@vanilla-extract/css"

export const quickSettingsTrigger = style({
  minHeight: "28px",
  padding: "2px 8px",
  border: "none",
  borderRadius: "9px",
  backgroundColor: "transparent",
  color: "#ffffff",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  ":checked": {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  ":focus-visible": {
    outline: "2px solid #a9c7ff",
  },
})

export const quickSettingsPanel = style({
  minWidth: "304px",
  padding: "16px",
})

export const quickSettingsChoice = style({
  minWidth: "132px",
  minHeight: "44px",
  padding: "8px 12px",
  borderRadius: "12px",
})

export const quickSettingsFooterButton = style({
  minWidth: "40px",
  minHeight: "40px",
  padding: "8px",
  borderRadius: "20px",
})
