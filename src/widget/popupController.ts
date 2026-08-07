export interface PopupSnapshot {
  readonly workspaceId: number | null
  readonly hideScheduled: boolean
}

export interface TimerDriver {
  schedule(callback: () => void, delayMs: number): number
  cancel(id: number): void
}

export class PopupController {
  readonly #timer: TimerDriver
  readonly #onChange: (snapshot: PopupSnapshot) => void
  #workspaceId: number | null = null
  #hideTimer = 0

  constructor(timer: TimerDriver, onChange: (snapshot: PopupSnapshot) => void) {
    this.#timer = timer
    this.#onChange = onChange
  }

  snapshot(): PopupSnapshot {
    return {
      workspaceId: this.#workspaceId,
      hideScheduled: this.#hideTimer !== 0,
    }
  }

  workspaceEnter(workspaceId: number, windowCount: number): void {
    this.#cancelHide()
    this.#workspaceId = windowCount > 0 ? workspaceId : null
    this.#emit()
  }

  workspaceLeave(): void {
    this.#scheduleHide()
  }

  popupEnter(): void {
    this.#cancelHide()
    this.#emit()
  }

  popupLeave(): void {
    this.#scheduleHide()
  }

  reset(): void {
    this.#cancelHide()
    this.#workspaceId = null
    this.#emit()
  }

  #scheduleHide(): void {
    this.#cancelHide()
    this.#hideTimer = this.#timer.schedule(() => {
      this.#hideTimer = 0
      this.#workspaceId = null
      this.#emit()
    }, 200)
    this.#emit()
  }

  #cancelHide(): void {
    if (this.#hideTimer === 0) return
    this.#timer.cancel(this.#hideTimer)
    this.#hideTimer = 0
  }

  #emit(): void {
    this.#onChange(this.snapshot())
  }
}
