import { PointerIntentTracker, PointerPoint, PointerTarget } from "../interaction/pointerIntent"
import { OrientationPolicy, PopupPlacement, Rect, Size } from "./orientationPolicy"

const HIDE_GRACE_MS = 200
const POINTER_INTENT_DELAY_MS = 300

export type PopupInteractionOrigin = "pointer" | "debug"

export type WorkspacePopupEvent =
  | {
      readonly type: "workspace-enter"
      readonly workspaceId: number
      readonly origin: PopupInteractionOrigin
    }
  | {
      readonly type: "pointer-motion"
      readonly point: PointerPoint
      readonly origin: "pointer"
    }
  | {
      readonly type: "workspace-leave" | "popup-enter" | "popup-leave" | "reset"
      readonly origin: PopupInteractionOrigin
    }

export type PopupPointerEvent =
  | { readonly type: "workspace-enter"; readonly workspaceId: number }
  | { readonly type: "workspace-leave" | "popup-enter" | "popup-leave" }

export interface WorkspacePopupSnapshot {
  readonly workspaceId: number | null
  readonly hideScheduled: boolean
  readonly lastPointerEvent: PopupPointerEvent | null
}

export interface PopupTimer {
  schedule(callback: () => void, delayMs: number): number
  cancel(id: number): void
}

export interface WorkspacePopupViewAdapter<Content> {
  render(content: Content): void
  measure(): Size
  resize(size: Size): void
  position(placement: PopupPlacement): void
  show(): void
}

export interface WorkspacePopupSessionOptions<Content> {
  readonly timer: PopupTimer
  readonly readContent: (workspaceId: number) => Content | null
  readonly hasContent: (content: Content) => boolean
  readonly resolveAnchor: (workspaceId: number) => Rect | null
  readonly resolvePointerTarget: (placement: PopupPlacement, size: Size) => PointerTarget
  readonly view: WorkspacePopupViewAdapter<Content>
  readonly policy: OrientationPolicy
  readonly onChange: (snapshot: WorkspacePopupSnapshot) => void
}

export class WorkspacePopupSession<Content> {
  readonly #options: WorkspacePopupSessionOptions<Content>
  #workspaceId: number | null = null
  #hideTimer = 0
  #deferredTimer = 0
  #lastPointerEvent: PopupPointerEvent | null = null
  #pointerTarget: PointerTarget | null = null
  #deferredWorkspaceId: number | null = null
  readonly #pointerIntent = new PointerIntentTracker()
  #destroyed = false

  constructor(options: WorkspacePopupSessionOptions<Content>) {
    this.#options = options
  }

  dispatch(event: WorkspacePopupEvent): void {
    if (this.#destroyed) return
    this.#recordPointerEvent(event)

    switch (event.type) {
      case "pointer-motion":
        this.#pointerIntent.record(event.point)
        this.#resolveDeferredWorkspace()
        return
      case "workspace-enter":
        this.#cancelHide()
        if (this.#shouldDeferWorkspace(event.workspaceId, event.origin)) {
          this.#deferWorkspace(event.workspaceId)
          return
        }
        this.#cancelDeferredWorkspace()
        if (!this.#present(event.workspaceId)) {
          this.#clearPresentation()
        }
        return
      case "workspace-leave":
      case "popup-leave":
        this.#scheduleHide()
        return
      case "popup-enter":
        this.#cancelHide()
        this.#cancelDeferredWorkspace()
        this.#pointerIntent.reset()
        this.#emit()
        return
      case "reset":
        this.#reset()
    }
  }

  synchronize(): void {
    if (this.#destroyed || this.#workspaceId === null) return
    if (!this.#present(this.#workspaceId)) this.#reset()
  }

  snapshot(): WorkspacePopupSnapshot {
    return {
      workspaceId: this.#workspaceId,
      hideScheduled: this.#hideTimer !== 0,
      lastPointerEvent: this.#lastPointerEvent,
    }
  }

  destroy(): void {
    if (this.#destroyed) return
    this.#cancelHide()
    this.#cancelDeferredWorkspace()
    this.#destroyed = true
  }

  #present(workspaceId: number): boolean {
    const content = this.#options.readContent(workspaceId)
    const anchor = this.#options.resolveAnchor(workspaceId)
    if (content === null || !this.#options.hasContent(content) || anchor === null) return false

    const switchedWorkspace = this.#workspaceId !== workspaceId
    this.#workspaceId = workspaceId
    this.#emit()
    this.#options.view.render(content)
    const size = this.#options.view.measure()
    this.#options.view.resize(size)
    const placement = this.#options.policy.placePopup(anchor, size)
    this.#pointerTarget = this.#options.resolvePointerTarget(placement, size)
    this.#options.view.position(placement)
    this.#options.view.show()
    if (switchedWorkspace) this.#pointerIntent.reset()
    return true
  }

  #shouldDeferWorkspace(workspaceId: number, origin: PopupInteractionOrigin): boolean {
    return (
      origin === "pointer" &&
      this.#workspaceId !== null &&
      workspaceId !== this.#workspaceId &&
      this.#pointerTarget !== null &&
      this.#pointerIntent.aimsAt(this.#pointerTarget)
    )
  }

  #resolveDeferredWorkspace(): void {
    if (this.#deferredWorkspaceId === null || this.#pointerTarget === null) return
    if (this.#pointerIntent.aimsAt(this.#pointerTarget)) return
    const workspaceId = this.#deferredWorkspaceId
    this.#cancelDeferredWorkspace()
    if (!this.#present(workspaceId)) this.#clearPresentation()
  }

  #deferWorkspace(workspaceId: number): void {
    this.#cancelDeferredWorkspace()
    this.#deferredWorkspaceId = workspaceId
    this.#deferredTimer = this.#options.timer.schedule(() => {
      if (this.#destroyed) return
      this.#deferredTimer = 0
      const deferredWorkspaceId = this.#deferredWorkspaceId
      this.#deferredWorkspaceId = null
      if (deferredWorkspaceId !== null && !this.#present(deferredWorkspaceId)) {
        this.#clearPresentation()
      }
    }, POINTER_INTENT_DELAY_MS)
  }

  #cancelDeferredWorkspace(): void {
    if (this.#deferredTimer !== 0) this.#options.timer.cancel(this.#deferredTimer)
    this.#deferredTimer = 0
    this.#deferredWorkspaceId = null
  }

  #recordPointerEvent(event: WorkspacePopupEvent): void {
    if (event.origin !== "pointer") return
    if (event.type === "pointer-motion") return
    this.#lastPointerEvent =
      event.type === "workspace-enter"
        ? { type: event.type, workspaceId: event.workspaceId }
        : event.type === "reset"
          ? this.#lastPointerEvent
          : { type: event.type }
  }

  #reset(): void {
    this.#cancelHide()
    this.#clearPresentation()
  }

  #clearPresentation(): void {
    this.#workspaceId = null
    this.#pointerTarget = null
    this.#cancelDeferredWorkspace()
    this.#pointerIntent.reset()
    this.#emit()
  }

  #scheduleHide(): void {
    this.#cancelHide()
    this.#hideTimer = this.#options.timer.schedule(() => {
      if (this.#destroyed) return
      this.#hideTimer = 0
      this.#clearPresentation()
    }, HIDE_GRACE_MS)
    this.#emit()
  }

  #cancelHide(): void {
    if (this.#hideTimer === 0) return
    this.#options.timer.cancel(this.#hideTimer)
    this.#hideTimer = 0
  }

  #emit(): void {
    this.#options.onChange(this.snapshot())
  }
}
