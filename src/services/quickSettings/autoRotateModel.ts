export type SensorOrientation = "normal" | "left-up" | "right-up" | "bottom-up"

export type NiriOutputTransform = "Normal" | "90" | "180" | "270"

export function orientationTransform(orientation: string | null): NiriOutputTransform | null {
  switch (orientation) {
    case "normal":
      return "Normal"
    case "left-up":
      return "90"
    case "right-up":
      return "270"
    case "bottom-up":
      return "180"
    default:
      return null
  }
}

export function uniqueInternalOutput(outputNames: ReadonlyArray<string>): string | null {
  const internal = outputNames.filter((name) => /^(?:eDP|LVDS|DSI)(?:-|$)/i.test(name))
  return internal.length === 1 ? internal[0] : null
}

export function niriOutputTransformRequest(output: string, transform: NiriOutputTransform): string {
  return JSON.stringify({
    Output: {
      output,
      action: { Transform: { transform } },
    },
  })
}

export function niriOutputNames(reply: unknown): ReadonlyArray<string> {
  if (typeof reply !== "object" || reply === null || !("Ok" in reply)) return []
  const ok = (reply as { readonly Ok?: unknown }).Ok
  if (typeof ok !== "object" || ok === null || !("Outputs" in ok)) return []
  const outputs = (ok as { readonly Outputs?: unknown }).Outputs
  if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs)) return []
  return Object.keys(outputs)
}

export function assertNiriRequestHandled(reply: unknown): void {
  if (typeof reply !== "object" || reply === null) throw new Error("Niri returned an invalid reply")
  if ("Err" in reply) throw new Error(String((reply as { readonly Err: unknown }).Err))
  if (!("Ok" in reply)) throw new Error("Niri did not acknowledge the request")
}
