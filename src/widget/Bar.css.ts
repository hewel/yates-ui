import { style } from "@vanilla-extract/css"

export const bar = style({
  backgroundColor: "#1d1d1d",
  minHeight: "30px",
  padding: "0 10px",
  color: "#ffffff",
})

export const barVertical = style({
  backgroundColor: "#1d1d1d",
  minWidth: "28px",
  padding: "6px 0",
  color: "#ffffff",
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
