import { Schema } from "effect"

export const exitCodes = {
  pass: 0,
  environment: 2,
  harness: 3,
  assertion: 4,
  cleanup: 5,
}

export type AcceptanceStatus = keyof typeof exitCodes

export interface AssertionResult {
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

export interface AcceptanceResult {
  readonly type: "yates-ui-acceptance"
  readonly version: 1
  readonly runId: string
  readonly ok: boolean
  readonly status: AcceptanceStatus
  readonly exitCode: number
  readonly artifactDir: string
  readonly assertions: ReadonlyArray<AssertionResult>
  readonly evidence: Readonly<Record<string, string>>
  readonly message: string
  readonly mutations: ReadonlyArray<string>
}

export interface ToolPaths {
  readonly bun: string | null
  readonly dbusRunSession: string | null
  readonly gdbus: string | null
  readonly gjs: string | null
  readonly niri: string | null
  readonly zenity: string | null
  readonly grim: string | null
  readonly magick: string | null
}

export interface EnvironmentInput {
  readonly tools: ToolPaths
  readonly waylandDisplay: string | undefined
  readonly xdgRuntimeDir: string | undefined
  readonly insideSession: boolean
  readonly dbusSessionBusAddress: string | undefined
}

export interface PreflightResult {
  readonly ok: boolean
  readonly failures: ReadonlyArray<string>
  readonly optionalUnavailable: ReadonlyArray<string>
}

export const DebugSnapshot = Schema.Struct({
  version: Schema.Number,
  ready: Schema.Boolean,
  pid: Schema.Number,
  activationCount: Schema.Number,
  settings: Schema.Struct({
    visible: Schema.Boolean,
    barOrientation: Schema.Literal("vertical", "horizontal"),
  }),
  quickSettings: Schema.Struct({
    volume: Schema.Number,
    wifiEnabled: Schema.Boolean,
    bluetoothEnabled: Schema.Boolean,
    powerProfile: Schema.String,
    darkMode: Schema.Boolean,
    nightLight: Schema.Boolean,
    pendingAction: Schema.NullOr(Schema.String),
    errorMessage: Schema.NullOr(Schema.String),
  }),
  niri: Schema.Struct({
    connected: Schema.Boolean,
    sequence: Schema.Number,
    workspaceIds: Schema.Array(Schema.Number),
    windowIds: Schema.Array(Schema.Number),
    focusedWorkspaceId: Schema.NullOr(Schema.Number),
    focusedWindowId: Schema.NullOr(Schema.Number),
  }),
  outputs: Schema.Array(
    Schema.Struct({
      connector: Schema.String,
      orientation: Schema.Literal("vertical", "horizontal"),
      barVisible: Schema.Boolean,
      popupVisible: Schema.Boolean,
      popupWorkspaceId: Schema.NullOr(Schema.Number),
      quickSettingsVisible: Schema.Boolean,
      quickSettingsPage: Schema.Literal(
        "main",
        "wifi",
        "bluetooth",
        "audio",
        "power-profile",
        "orientation",
        "session-confirmation",
      ),
      hideScheduled: Schema.Boolean,
    }),
  ),
})

export const NiriLayer = Schema.Struct({
  namespace: Schema.String,
  output: Schema.String,
  layer: Schema.String,
  keyboard_interactivity: Schema.String,
})

export const NiriLayers = Schema.Array(NiriLayer)

export function preflightEnvironment(input: EnvironmentInput): PreflightResult {
  const failures: string[] = []
  const required: ReadonlyArray<readonly [string, string | null]> = [
    ["bun", input.tools.bun],
    ["dbus-run-session", input.tools.dbusRunSession],
    ["gdbus", input.tools.gdbus],
    ["gjs", input.tools.gjs],
    ["niri", input.tools.niri],
    ["zenity", input.tools.zenity],
  ]
  for (const [name, path] of required) {
    if (!path) failures.push(`required tool not found: ${name}`)
  }
  if (!input.waylandDisplay) failures.push("WAYLAND_DISPLAY is not set")
  if (!input.xdgRuntimeDir) failures.push("XDG_RUNTIME_DIR is not set")
  if (input.insideSession && !input.dbusSessionBusAddress) {
    failures.push("isolated D-Bus session was not created")
  }

  const optionalUnavailable: string[] = []
  if (!input.tools.grim) optionalUnavailable.push("grim")
  if (!input.tools.magick) optionalUnavailable.push("magick")
  return { ok: failures.length === 0, failures, optionalUnavailable }
}

export function assertOneBarPerOutput(
  outputs: ReadonlyArray<string>,
  layers: ReadonlyArray<Schema.Schema.Type<typeof NiriLayer>>,
): AssertionResult {
  const counts = new Map<string, number>()
  for (const layer of layers) {
    if (layer.namespace === "yates-bar") {
      counts.set(layer.output, (counts.get(layer.output) ?? 0) + 1)
    }
  }
  const problems = outputs.filter((output) => counts.get(output) !== 1)
  const unexpected = [...counts.keys()].filter((output) => !outputs.includes(output))
  return {
    name: "one-yates-bar-per-output",
    ok: problems.length === 0 && unexpected.length === 0,
    detail:
      problems.length === 0 && unexpected.length === 0
        ? `${outputs.length} output(s), exactly one layer each`
        : `bad outputs=${JSON.stringify(problems)}, unexpected=${JSON.stringify(unexpected)}, counts=${JSON.stringify(Object.fromEntries(counts))}`,
  }
}

export function decodeGdbusString(stdout: string): string | null {
  const trimmed = stdout.trim()
  if (!trimmed.startsWith("('") || !trimmed.endsWith("',)")) return null
  return trimmed.slice(2, -3).replaceAll("\\'", "'").replaceAll("\\\\", "\\")
}

export function waylandDisplayFromNiriSocket(socketName: string): string | null {
  const name = socketName.split("/").at(-1) ?? socketName
  if (!name.startsWith("niri.") || !name.endsWith(".sock")) return null
  const displayAndPid = name.slice("niri.".length, -".sock".length)
  const pidSeparator = displayAndPid.lastIndexOf(".")
  if (pidSeparator <= 0) return null
  const pid = displayAndPid.slice(pidSeparator + 1)
  return /^\d+$/.test(pid) ? displayAndPid.slice(0, pidSeparator) : null
}

export function makeResult(
  runId: string,
  artifactDir: string,
  status: AcceptanceStatus,
  message: string,
  assertions: ReadonlyArray<AssertionResult> = [],
  evidence: Readonly<Record<string, string>> = {},
): AcceptanceResult {
  return {
    type: "yates-ui-acceptance",
    version: 1,
    runId,
    ok: status === "pass",
    status,
    exitCode: exitCodes[status],
    artifactDir,
    assertions,
    evidence,
    message,
    mutations: [],
  }
}

export function classifyIsolatedSessionExit(exitCode: number): AcceptanceStatus {
  if (exitCode === exitCodes.harness) return "harness"
  if (exitCode === exitCodes.assertion) return "assertion"
  if (exitCode === exitCodes.cleanup) return "cleanup"
  return "environment"
}
