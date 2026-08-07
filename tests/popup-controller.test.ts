import { describe, expect, test } from "bun:test"

import { PopupController, TimerDriver } from "../src/widget/popupController"

function fakeTimer() {
  let callback: (() => void) | null = null
  const driver: TimerDriver = {
    schedule: (next) => {
      callback = next
      return 1
    },
    cancel: () => {
      callback = null
    },
  }
  return { driver, fire: () => callback?.() }
}

describe("workspace popup controller", () => {
  test("shows a populated workspace and hides after leave timeout", () => {
    const timer = fakeTimer()
    const snapshots: Array<number | null> = []
    const popup = new PopupController(timer.driver, (snapshot) => {
      snapshots.push(snapshot.workspaceId)
    })

    popup.workspaceEnter(8, 2)
    popup.workspaceLeave()
    expect(popup.snapshot()).toEqual({ workspaceId: 8, hideScheduled: true })
    timer.fire()

    expect(popup.snapshot()).toEqual({ workspaceId: null, hideScheduled: false })
    expect(snapshots).toEqual([8, 8, null])
  })

  test("popup enter cancels a pending hide", () => {
    const timer = fakeTimer()
    const popup = new PopupController(timer.driver, () => {})

    popup.workspaceEnter(8, 1)
    popup.workspaceLeave()
    popup.popupEnter()
    timer.fire()

    expect(popup.snapshot()).toEqual({ workspaceId: 8, hideScheduled: false })
  })

  test("empty workspaces and reset close the popup", () => {
    const timer = fakeTimer()
    const popup = new PopupController(timer.driver, () => {})

    popup.workspaceEnter(8, 0)
    expect(popup.snapshot().workspaceId).toBeNull()
    popup.workspaceEnter(8, 1)
    popup.reset()
    expect(popup.snapshot()).toEqual({ workspaceId: null, hideScheduled: false })
  })
})
