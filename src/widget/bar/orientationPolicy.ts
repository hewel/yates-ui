import { format } from "date-fns"

export type BarOrientation = "horizontal" | "vertical"

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Size {
  readonly width: number
  readonly height: number
}

export interface PopupPlacement {
  readonly marginLeft: number
  readonly marginTop: number
}

export interface BarLayoutSpec {
  readonly axis: BarOrientation
  readonly styleVariant: "normal" | "vertical"
  readonly workspaceMarginTop: number
  readonly showWindowTitle: boolean
  readonly clockLabels: readonly string[]
  readonly barAnchors: readonly ("top" | "left" | "right" | "bottom")[]
}

export interface OrientationPolicy {
  layout(now: Date): BarLayoutSpec
  placePopup(anchor: Rect, size: Size): PopupPlacement
}

const verticalPolicy: OrientationPolicy = {
  layout: (now) => ({
    axis: "vertical",
    styleVariant: "vertical",
    workspaceMarginTop: 24,
    showWindowTitle: false,
    clockLabels: [format(now, "HH"), format(now, "mm")],
    barAnchors: ["top", "left", "bottom"],
  }),
  placePopup: (anchor, size) => ({
    marginLeft: 2,
    marginTop: Math.max(0, Math.round(anchor.y + anchor.height / 2 - size.height / 2)),
  }),
}

const horizontalPolicy: OrientationPolicy = {
  layout: (now) => ({
    axis: "horizontal",
    styleVariant: "normal",
    workspaceMarginTop: 0,
    showWindowTitle: true,
    clockLabels: [format(now, "EEE MMM d  HH:mm")],
    barAnchors: ["top", "left", "right"],
  }),
  placePopup: (anchor) => ({
    marginLeft: Math.max(0, Math.round(anchor.x)),
    marginTop: 2,
  }),
}

export function orientationPolicy(orientation: BarOrientation): OrientationPolicy {
  return orientation === "vertical" ? verticalPolicy : horizontalPolicy
}
