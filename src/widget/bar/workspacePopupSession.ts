import { OrientationPolicy, PopupPlacement, Rect, Size } from "./orientationPolicy"

export type PopupInteractionOrigin = "pointer" | "debug"

export type WorkspacePopupEvent =
  | {
      readonly type: "workspace-enter"
      readonly workspaceId: number
      readonly origin: PopupInteractionOrigin
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
  readonly view: WorkspacePopupViewAdapter<Content>
  readonly policy: OrientationPolicy
  readonly onChange: (snapshot: WorkspacePopupSnapshot) => void
}

export class WorkspacePopupSession<Content> {
  readonly #options: WorkspacePopupSessionOptions<Content>
  #workspaceId: number | null = null
  #hideTimer = 0
  #lastPointerEvent: PopupPointerEvent | null = null
  #destroyed = false

  constructor(options: WorkspacePopupSessionOptions<Content>) {
    this.#options = options
  }

  dispatch(event: WorkspacePopupEvent): void {
    if (this.#destroyed) return
    this.#recordPointerEvent(event)

    switch (event.type) {
      case "workspace-enter":
        this.#cancelHide()
        if (!this.#present(event.workspaceId)) {
          this.#workspaceId = null
          this.#emit()
        }
        return
      case "workspace-leave":
      case "popup-leave":
        this.#scheduleHide()
        return
      case "popup-enter":
        this.#cancelHide()
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
    this.#destroyed = true
  }

  #present(workspaceId: number): boolean {
    const content = this.#options.readContent(workspaceId)
    const anchor = this.#options.resolveAnchor(workspaceId)
    if (content === null || !this.#options.hasContent(content) || anchor === null) return false

    this.#workspaceId = workspaceId
    this.#emit()
    this.#options.view.render(content)
    const size = this.#options.view.measure()
    this.#options.view.resize(size)
    this.#options.view.position(this.#options.policy.placePopup(anchor, size))
    this.#options.view.show()
    return true
  }

  #recordPointerEvent(event: WorkspacePopupEvent): void {
    if (event.origin !== "pointer") return
    this.#lastPointerEvent =
      event.type === "workspace-enter"
        ? { type: event.type, workspaceId: event.workspaceId }
        : event.type === "reset"
          ? this.#lastPointerEvent
          : { type: event.type }
  }

  #reset(): void {
    this.#cancelHide()
    this.#workspaceId = null
    this.#emit()
  }

  #scheduleHide(): void {
    this.#cancelHide()
    this.#hideTimer = this.#options.timer.schedule(() => {
      if (this.#destroyed) return
      this.#hideTimer = 0
      this.#workspaceId = null
      this.#emit()
    }, 200)
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
