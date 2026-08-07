import { describe, expect, test } from "bun:test"

import { BAR_ORIENTATIONS, normalizeBarOrientation } from "../src/settings/appSettingsModel"

describe("application settings", () => {
  test("defines the two supported bar orientations", () => {
    expect(BAR_ORIENTATIONS).toEqual(["vertical", "horizontal"])
  })

  test("normalizes persisted values defensively", () => {
    expect(normalizeBarOrientation("horizontal")).toBe("horizontal")
    expect(normalizeBarOrientation("vertical")).toBe("vertical")
    expect(normalizeBarOrientation("diagonal")).toBe("vertical")
  })
})
