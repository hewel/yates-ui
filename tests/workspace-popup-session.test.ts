import { describe, expect, test } from "bun:test"

import { orientationPolicy } from "../src/widget/bar/orientationPolicy"
import {
  PopupTimer,
  WorkspacePopupSession,
  WorkspacePopupSnapshot,
  WorkspacePopupViewAdapter,
} from "../src/widget/bar/workspacePopupSession"

function fakeTimer() {
  let nextId = 1
  const callbacks = new Map<number, () => void>()
  const delays = new Map<number, number>()
  const timer: PopupTimer = {
    schedule: (callback, delayMs) => {
      const id = nextId++
      callbacks.set(id, callback)
      delays.set(id, delayMs)
      return id
    },
    cancel: (id) => {
      callbacks.delete(id)
      delays.delete(id)
    },
  }
  return {
    timer,
    fire: (id: number) => {
      const callback = callbacks.get(id)
      callbacks.delete(id)
      delays.delete(id)
      callback?.()
    },
    pending: () => [...callbacks.keys()],
    delay: (id: number) => delays.get(id),
  }
}

function createSession(
  counts: Map<number, number>,
  timer: PopupTimer,
  onChange: (snapshot: WorkspacePopupSnapshot) => void = () => {},
  view: WorkspacePopupViewAdapter<readonly number[]> = {
    render: () => {},
    measure: () => ({ width: 80, height: 30 }),
    resize: () => {},
    position: () => {},
    show: () => {},
  },
  readContent: (workspaceId: number) => readonly number[] = (workspaceId) => {
    const count = counts.get(workspaceId) ?? 0
    return Array.from({ length: count }, (_, index) => index)
  },
) {
  return new WorkspacePopupSession({
    timer,
    readContent,
    hasContent: (content) => content.length > 0,
    resolveAnchor: () => ({ x: 0, y: 40, width: 32, height: 20 }),
    resolvePointerTarget: (placement, size) => ({
      x: 40,
      y: placement.marginTop,
      width: size.width,
      height: size.height,
    }),
    view,
    policy: orientationPolicy("vertical"),
    onChange,
  })
}

describe("workspace popup session", () => {
  test("shares populated workspace behavior without letting debug events rewrite pointer telemetry", () => {
    const counts = new Map([[8, 2]])
    const timer = fakeTimer()
    const session = createSession(counts, timer.timer)

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "debug" })
    expect(session.snapshot()).toEqual({
      workspaceId: 8,
      hideScheduled: false,
      lastPointerEvent: null,
    })

    session.dispatch({ type: "workspace-leave", origin: "pointer" })
    expect(session.snapshot()).toEqual({
      workspaceId: 8,
      hideScheduled: true,
      lastPointerEvent: { type: "workspace-leave" },
    })
  })

  test("keeps the popup open when the pointer crosses the hide-grace seam", () => {
    const timer = fakeTimer()
    const session = createSession(new Map([[8, 1]]), timer.timer)

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "pointer" })
    session.dispatch({ type: "workspace-leave", origin: "pointer" })
    const [hideId] = timer.pending()
    session.dispatch({ type: "popup-enter", origin: "pointer" })
    timer.fire(hideId)

    expect(session.snapshot()).toEqual({
      workspaceId: 8,
      hideScheduled: false,
      lastPointerEvent: { type: "popup-enter" },
    })
  })

  test("hides the popup when the grace timer completes", () => {
    const timer = fakeTimer()
    const session = createSession(new Map([[8, 1]]), timer.timer)

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "pointer" })
    session.dispatch({ type: "workspace-leave", origin: "pointer" })
    const [hideId] = timer.pending()
    expect(timer.delay(hideId)).toBe(200)
    timer.fire(hideId)

    expect(session.snapshot()).toEqual({
      workspaceId: null,
      hideScheduled: false,
      lastPointerEvent: { type: "workspace-leave" },
    })
  })

  test("switches workspaces, hides empty content, and reconciles windows that disappear", () => {
    const counts = new Map([
      [8, 2],
      [9, 1],
    ])
    const timer = fakeTimer()
    const session = createSession(counts, timer.timer)

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "pointer" })
    session.dispatch({ type: "workspace-leave", origin: "pointer" })
    session.dispatch({ type: "workspace-enter", workspaceId: 9, origin: "pointer" })
    expect(timer.pending()).toEqual([])
    expect(session.snapshot().workspaceId).toBe(9)

    counts.set(9, 0)
    session.synchronize()
    expect(session.snapshot().workspaceId).toBeNull()

    session.dispatch({ type: "workspace-enter", workspaceId: 10, origin: "debug" })
    expect(session.snapshot().workspaceId).toBeNull()
  })

  test("keeps the current workspace while the pointer aims through the popup cone", () => {
    const counts = new Map([
      [8, 2],
      [9, 1],
    ])
    const timer = fakeTimer()
    const session = createSession(counts, timer.timer)

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "pointer" })
    session.dispatch({ type: "pointer-motion", point: { x: 8, y: 42 }, origin: "pointer" })
    session.dispatch({ type: "pointer-motion", point: { x: 18, y: 46 }, origin: "pointer" })
    session.dispatch({ type: "pointer-motion", point: { x: 28, y: 50 }, origin: "pointer" })
    session.dispatch({ type: "workspace-leave", origin: "pointer" })
    session.dispatch({ type: "workspace-enter", workspaceId: 9, origin: "pointer" })

    expect(session.snapshot().workspaceId).toBe(8)
    expect(timer.pending()).toHaveLength(1)

    session.dispatch({ type: "pointer-motion", point: { x: 30, y: 82 }, origin: "pointer" })

    expect(session.snapshot().workspaceId).toBe(9)
    expect(timer.pending()).toEqual([])
  })

  test("bounds the prediction-cone delay when the pointer pauses on a sibling", () => {
    const counts = new Map([
      [8, 2],
      [9, 1],
    ])
    const timer = fakeTimer()
    const session = createSession(counts, timer.timer)

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "pointer" })
    session.dispatch({ type: "pointer-motion", point: { x: 8, y: 42 }, origin: "pointer" })
    session.dispatch({ type: "pointer-motion", point: { x: 18, y: 46 }, origin: "pointer" })
    session.dispatch({ type: "pointer-motion", point: { x: 28, y: 50 }, origin: "pointer" })
    session.dispatch({ type: "workspace-enter", workspaceId: 9, origin: "pointer" })
    const [intentDelayId] = timer.pending()

    expect(session.snapshot().workspaceId).toBe(8)
    expect(timer.delay(intentDelayId)).toBe(300)
    timer.fire(intentDelayId)
    expect(session.snapshot().workspaceId).toBe(9)
  })

  test("updates content before measuring, resizing, positioning, and showing", () => {
    const calls: string[] = []
    const timer = fakeTimer()
    const session = createSession(new Map([[8, 2]]), timer.timer, () => {}, {
      render: (content) => calls.push(`render:${content.join(",")}`),
      measure: () => {
        calls.push("measure")
        return { width: 80, height: 30 }
      },
      resize: (size) => calls.push(`resize:${size.width}x${size.height}`),
      position: (placement) =>
        calls.push(`position:${placement.marginLeft},${placement.marginTop}`),
      show: () => calls.push("show"),
    })

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "debug" })

    expect(calls).toEqual(["render:0,1", "measure", "resize:80x30", "position:2,35", "show"])
  })

  test("re-renders and resizes when an open workspace changes", () => {
    const counts = new Map([[8, 2]])
    const rendered: number[] = []
    const timer = fakeTimer()
    const session = createSession(counts, timer.timer, () => {}, {
      render: (content) => rendered.push(content.length),
      measure: () => ({ width: 80, height: 30 }),
      resize: () => {},
      position: () => {},
      show: () => {},
    })

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "pointer" })
    counts.set(8, 1)
    session.synchronize()

    expect(rendered).toEqual([2, 1])
  })

  test("re-renders changed content when a window keeps the same identity", () => {
    let content: readonly number[] = [1]
    const rendered: number[][] = []
    const timer = fakeTimer()
    const session = createSession(
      new Map([[8, 1]]),
      timer.timer,
      () => {},
      {
        render: (nextContent) => rendered.push([...nextContent]),
        measure: () => ({ width: 80, height: 30 }),
        resize: () => {},
        position: () => {},
        show: () => {},
      },
      () => content,
    )

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "pointer" })
    content = [9]
    session.synchronize()

    expect(rendered).toEqual([[1], [9]])
  })

  test("destroy cancels pending work and prevents late state changes", () => {
    const timer = fakeTimer()
    const snapshots: Array<number | null> = []
    const session = createSession(new Map([[8, 1]]), timer.timer, (snapshot) => {
      snapshots.push(snapshot.workspaceId)
    })

    session.dispatch({ type: "workspace-enter", workspaceId: 8, origin: "pointer" })
    session.dispatch({ type: "popup-leave", origin: "pointer" })
    const [hideId] = timer.pending()
    session.destroy()
    timer.fire(hideId)
    session.dispatch({ type: "reset", origin: "debug" })

    expect(timer.pending()).toEqual([])
    expect(session.snapshot().workspaceId).toBe(8)
    expect(snapshots).toEqual([8, 8])
  })
})
