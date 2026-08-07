import GLib from "gi://GLib"

const runId = GLib.getenv("YATES_RUN_ID") ?? `gjs-${GLib.get_monotonic_time()}`
let sequence = 0

export function diagnosticLog(
  event: string,
  fields: Readonly<Record<string, boolean | number | string | null>> = {},
): void {
  sequence += 1
  printerr(
    `${JSON.stringify({
      ts: new Date().toISOString(),
      runId,
      sequence,
      event,
      ...fields,
    })}\n`,
  )
}

export function diagnosticRunId(): string {
  return runId
}
