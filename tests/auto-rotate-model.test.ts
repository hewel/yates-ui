import { describe, expect, test } from "bun:test"

import {
  niriOutputNames,
  niriOutputTransformRequest,
  orientationTransform,
  uniqueInternalOutput,
} from "../src/services/quickSettings/autoRotateModel"

describe("auto rotate policy", () => {
  test("maps SensorProxy orientations to Niri's counter-clockwise transforms", () => {
    expect(orientationTransform("normal")).toBe("Normal")
    expect(orientationTransform("left-up")).toBe("90")
    expect(orientationTransform("right-up")).toBe("270")
    expect(orientationTransform("bottom-up")).toBe("180")
    expect(orientationTransform("undefined")).toBeNull()
  })

  test("requires exactly one connected internal panel", () => {
    expect(uniqueInternalOutput(["DP-1", "eDP-1"])).toBe("eDP-1")
    expect(uniqueInternalOutput(["DSI-1"])).toBe("DSI-1")
    expect(uniqueInternalOutput(["DP-1", "HDMI-A-1"])).toBeNull()
    expect(uniqueInternalOutput(["eDP-1", "LVDS-1"])).toBeNull()
  })

  test("decodes output names and emits Niri's exact temporary transform request", () => {
    const reply = {
      Ok: {
        Outputs: {
          "eDP-1": { name: "eDP-1" },
          "DP-1": { name: "DP-1" },
        },
      },
    }

    expect(niriOutputNames(reply)).toEqual(["eDP-1", "DP-1"])
    expect(niriOutputTransformRequest("eDP-1", "90")).toBe(
      '{"Output":{"output":"eDP-1","action":{"Transform":{"transform":"90"}}}}',
    )
  })
})
