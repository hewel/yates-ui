import { style } from "@vanilla-extract/css"

export const bar = style({
  backgroundColor: "#1d1d1d",
  minHeight: "30px",
  padding: "0 10px",
  color: "#ffffff",
})

export const barVertical = style({
  backgroundColor: "#1d1d1d",
  minWidth: "36px",
  padding: "4px 0",
  color: "#ffffff",
})

/**
 * The vertical shell is deliberately narrow. Keep every direct child inside
 * its 32px visual column so the 2px gutters remain visible at either edge.
 */
export const barVerticalSection = style({
  minWidth: "32px",
})

export const workspacesVertical = style({
  minWidth: "32px",
})

export const quickSettingsStatus = style({
  minHeight: "20px",
  color: "#ffffff",
})

export const quickSettingsStatusVertical = style({
  minWidth: "32px",
})

export const batteryStatus = style({
  minHeight: "20px",
})

export const batteryStatusVertical = style({
  minWidth: "32px",
})

export const privacyIndicator = style({
  minWidth: "28px",
  minHeight: "28px",
  padding: "0",
  border: "none",
  borderRadius: "14px",
  backgroundColor: "transparent",
  color: "#ffffff",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  ":checked": {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
})

export const privacyIndicatorVertical = style({
  minWidth: "32px",
  minHeight: "32px",
  borderRadius: "16px",
})

export const privacyPopover = style({
  padding: "10px",
  borderRadius: "12px",
  backgroundColor: "#2a2a2e",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
  color: "#ffffff",
})

export const privacyCastRow = style({
  minWidth: "216px",
  minHeight: "36px",
  padding: "0 2px 0 8px",
  borderRadius: "8px",
})

export const privacyCastLabel = style({
  fontSize: "0.8rem",
  color: "#ffffff",
})

export const privacyStopButton = style({
  minWidth: "56px",
  minHeight: "28px",
  padding: "0 8px",
  border: "none",
  borderRadius: "14px",
  backgroundColor: "rgba(255, 255, 255, 0.14)",
  color: "#ffffff",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  ":active": {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
})

export const workspaces = style({
  padding: "2px 0",
})

export const workspaceButton = style({
  minWidth: "16px",
  minHeight: "18px",
  padding: "1px 4px",
  border: "none",
  borderRadius: "9px",
  backgroundColor: "transparent",
  color: "#c0c4d0",
  fontWeight: "500",
  fontSize: "0.78rem",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
})

export const workspaceButtonActive = style({
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "#ffffff",
  fontWeight: "700",
})

export const workspacePopup = style({
  backgroundColor: "#2a2a2e",
  borderRadius: "10px",
  padding: "8px 10px",
  color: "#ffffff",
})

export const popupWindow = style({
  backgroundColor: "transparent",
  boxShadow: "none",
})

export const workspacePopupButton = style({
  minWidth: "32px",
  minHeight: "32px",
  padding: "4px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "transparent",
  color: "inherit",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  ":active": {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
})

export const windowTitle = style({
  fontWeight: "500",
  fontSize: "0.8rem",
  color: "#e6e9ef",
})

export const clock = style({
  fontWeight: "700",
  fontSize: "0.8rem",
  color: "#ffffff",
})

export const batteryLabel = style({
  fontWeight: "500",
  fontSize: "0.75rem",
})
