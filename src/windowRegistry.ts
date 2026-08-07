export interface DestroyableWindow {
  destroy(): void
}

export class WindowRegistry<T extends DestroyableWindow> {
  readonly #create: (connector: string) => T
  readonly #windows = new Map<string, T>()

  constructor(create: (connector: string) => T) {
    this.#create = create
  }

  connectors(): ReadonlyArray<string> {
    return [...this.#windows.keys()]
  }

  get(connector: string): T | undefined {
    return this.#windows.get(connector)
  }

  reconcile(connectors: ReadonlyArray<string>): void {
    const desired = new Set(connectors)
    for (const [connector, window] of this.#windows) {
      if (desired.has(connector)) continue
      window.destroy()
      this.#windows.delete(connector)
    }
    for (const connector of desired) {
      if (!this.#windows.has(connector)) {
        this.#windows.set(connector, this.#create(connector))
      }
    }
  }

  destroy(): void {
    for (const window of this.#windows.values()) window.destroy()
    this.#windows.clear()
  }
}
