import { describe, expect, test } from "bun:test"

import { PointerIntentTracker } from "../src/widget/interaction/pointerIntent"

describe("pointer intent", () => {
  test("recognizes a trajectory through the prediction cone toward a side popup", () => {
    const tracker = new PointerIntentTracker()

    tracker.record({ x: 8, y: 42 })
    tracker.record({ x: 18, y: 46 })
    tracker.record({ x: 28, y: 50 })

    expect(tracker.aimsAt({ x: 40, y: 24, width: 80, height: 52 })).toBe(true)
  })

  test("rejects movement that crosses sibling triggers away from the popup", () => {
    const tracker = new PointerIntentTracker()

    tracker.record({ x: 8, y: 42 })
    tracker.record({ x: 12, y: 58 })
    tracker.record({ x: 14, y: 78 })

    expect(tracker.aimsAt({ x: 40, y: 24, width: 80, height: 52 })).toBe(false)
  })

  test("follows a recent turn instead of a stale toward-popup sample", () => {
    const tracker = new PointerIntentTracker()
    const target = { x: 40, y: 24, width: 80, height: 52 }

    tracker.record({ x: 8, y: 42 })
    tracker.record({ x: 18, y: 44 })
    tracker.record({ x: 28, y: 46 })
    expect(tracker.aimsAt(target)).toBe(true)

    tracker.record({ x: 26, y: 48 })
    tracker.record({ x: 22, y: 52 })
    expect(tracker.aimsAt(target)).toBe(false)
  })

  test("works for a popup below a horizontal bar", () => {
    const tracker = new PointerIntentTracker()

    tracker.record({ x: 32, y: 4 })
    tracker.record({ x: 38, y: 14 })
    tracker.record({ x: 44, y: 24 })

    expect(tracker.aimsAt({ x: 20, y: 40, width: 72, height: 32 })).toBe(true)
  })

  test("requires deliberate travel and can be reset at a surface boundary", () => {
    const tracker = new PointerIntentTracker()
    const target = { x: 40, y: 24, width: 80, height: 52 }

    tracker.record({ x: 28, y: 50 })
    tracker.record({ x: 30, y: 51 })
    expect(tracker.aimsAt(target)).toBe(false)

    tracker.record({ x: 36, y: 52 })
    expect(tracker.aimsAt(target)).toBe(true)

    tracker.reset()
    expect(tracker.aimsAt(target)).toBe(false)
  })
})
