export const BAR_ORIENTATIONS = ["vertical", "horizontal"] as const

export type BarOrientation = (typeof BAR_ORIENTATIONS)[number]

export function normalizeBarOrientation(value: string): BarOrientation {
  return value === "horizontal" ? "horizontal" : "vertical"
}
