import { style } from "@vanilla-extract/css";

export const bar = style({
    backgroundColor: "rgba(28, 30, 36, 0.9)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
    minHeight: "24px",
    padding: "4px 10px",
});

export const content = style({
    width: "100%",
});

export const workspaceRail = style({
    minWidth: "12px",
});

export const workspaceButton = style({
    minWidth: "12px",
    minHeight: "12px",
    padding: "0",
    border: "none",
    backgroundColor: "transparent",
});

export const workspaceDot = style({
    fontWeight: "700",
    fontSize: "0.74rem",
    color: "#8f95a3",
    lineHeight: "1.15",
    minWidth: "10px",
});

export const workspaceDotActive = style({
    color: "#eef1f7",
});

export const windowTitle = style({
    fontWeight: "500",
    fontSize: "0.82rem",
    color: "#e6e9ef",
});

export const metaLabel = style({
    fontWeight: "600",
    fontSize: "0.72rem",
    color: "#b8bfcc",
});
