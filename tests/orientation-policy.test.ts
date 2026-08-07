import { describe, expect, test } from "bun:test"

import { orientationPolicy } from "../src/widget/bar/orientationPolicy"

describe("bar orientation policy", () => {
  const now = new Date(2026, 7, 7, 9, 5)

  test("describes the vertical bar layout", () => {
    expect(orientationPolicy("vertical").layout(now)).toEqual({
      axis: "vertical",
      styleVariant: "vertical",
      workspaceMarginTop: 24,
      showWindowTitle: false,
      clockLabels: ["09", "05"],
      barAnchors: ["top", "left", "bottom"],
      quickSettingsDirection: "right",
    })
  })

  test("centers a vertical popup on its workspace button and clamps it to the edge", () => {
    const policy = orientationPolicy("vertical")

    expect(
      policy.placePopup({ x: 0, y: 40, width: 32, height: 20 }, { width: 80, height: 30 }),
    ).toEqual({ marginLeft: 2, marginTop: 35 })
    expect(
      policy.placePopup({ x: 0, y: 2, width: 32, height: 10 }, { width: 80, height: 40 }),
    ).toEqual({ marginLeft: 2, marginTop: 0 })
    expect(
      policy.popupTarget(
        { marginLeft: 2, marginTop: 35 },
        { width: 80, height: 30 },
        { width: 32, height: 120 },
      ),
    ).toEqual({ x: 34, y: 35, width: 80, height: 30 })
  })

  test("describes the horizontal bar layout", () => {
    expect(orientationPolicy("horizontal").layout(now)).toEqual({
      axis: "horizontal",
      styleVariant: "normal",
      workspaceMarginTop: 0,
      showWindowTitle: true,
      clockLabels: ["Fri Aug 7  09:05"],
      barAnchors: ["top", "left", "right"],
      quickSettingsDirection: "down",
    })
  })

  test("places a horizontal popup below its workspace button and clamps it to the edge", () => {
    const policy = orientationPolicy("horizontal")

    expect(
      policy.placePopup({ x: 48, y: 0, width: 20, height: 30 }, { width: 80, height: 40 }),
    ).toEqual({ marginLeft: 48, marginTop: 2 })
    expect(
      policy.placePopup({ x: -8, y: 0, width: 20, height: 30 }, { width: 80, height: 40 }),
    ).toEqual({ marginLeft: 0, marginTop: 2 })
    expect(
      policy.popupTarget(
        { marginLeft: 48, marginTop: 2 },
        { width: 80, height: 40 },
        { width: 120, height: 30 },
      ),
    ).toEqual({ x: 48, y: 32, width: 80, height: 40 })
  })
})
