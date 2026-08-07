export interface PointerPoint {
  readonly x: number
  readonly y: number
}

export interface PointerTarget {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const MAX_SAMPLES = 8
const MIN_TRAVEL = 6
const TARGET_TOLERANCE = 8
const EPSILON = 0.001

function distanceSquared(from: PointerPoint, to: PointerPoint): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return dx * dx + dy * dy
}

function rayIntersectsTarget(
  origin: PointerPoint,
  pointer: PointerPoint,
  target: PointerTarget,
): boolean {
  const direction = { x: pointer.x - origin.x, y: pointer.y - origin.y }
  const minimum = {
    x: target.x - TARGET_TOLERANCE,
    y: target.y - TARGET_TOLERANCE,
  }
  const maximum = {
    x: target.x + target.width + TARGET_TOLERANCE,
    y: target.y + target.height + TARGET_TOLERANCE,
  }
  let entry = 1
  let exit = Number.POSITIVE_INFINITY

  for (const axis of ["x", "y"] as const) {
    const velocity = direction[axis]
    if (Math.abs(velocity) < EPSILON) {
      if (origin[axis] < minimum[axis] || origin[axis] > maximum[axis]) return false
      continue
    }

    const first = (minimum[axis] - origin[axis]) / velocity
    const second = (maximum[axis] - origin[axis]) / velocity
    entry = Math.max(entry, Math.min(first, second))
    exit = Math.min(exit, Math.max(first, second))
    if (exit < entry) return false
  }

  return exit >= entry
}

export class PointerIntentTracker {
  readonly #samples: PointerPoint[] = []

  record(point: PointerPoint): void {
    this.#samples.push(point)
    if (this.#samples.length > MAX_SAMPLES) this.#samples.shift()
  }

  aimsAt(target: PointerTarget): boolean {
    const pointer = this.#samples.at(-1)
    if (!pointer) return false
    const origin = this.#recentOrigin(pointer)
    if (!origin) return false
    return rayIntersectsTarget(origin, pointer, target)
  }

  #recentOrigin(pointer: PointerPoint): PointerPoint | null {
    for (let index = this.#samples.length - 2; index >= 0; index -= 1) {
      const candidate = this.#samples[index]
      if (candidate && distanceSquared(candidate, pointer) >= MIN_TRAVEL * MIN_TRAVEL) {
        return candidate
      }
    }
    return null
  }

  reset(): void {
    this.#samples.length = 0
  }
}
