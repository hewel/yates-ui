import { style } from "@vanilla-extract/css"

export const settingsWindow = style({
  backgroundColor: "#18181b",
  color: "#ffffff",
})

export const settingsContent = style({
  minWidth: "280px",
  padding: "18px",
})

export const settingsTitle = style({
  fontSize: "1.05rem",
  fontWeight: "700",
})

export const settingsCard = style({
  padding: "14px",
  borderRadius: "12px",
  backgroundColor: "#26262b",
})

export const settingsLabel = style({
  fontSize: "0.9rem",
  fontWeight: "700",
})

export const settingsDescription = style({
  fontSize: "0.78rem",
  color: "#c0c4d0",
})

export const orientationOption = style({
  minHeight: "32px",
  padding: "4px 8px",
  borderRadius: "8px",
  color: "#ffffff",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  ":focus-visible": {
    outline: "2px solid #a9c7ff",
  },
})
