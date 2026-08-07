#!/usr/bin/env bun

import { Data, Effect, Either, Schema } from "effect"
import { spawn } from "node:child_process"
import { appendFileSync, chmodSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import {
  AcceptanceResult,
  AssertionResult,
  DebugSnapshot,
  NiriLayers,
  ToolPaths,
  assertOneBarPerOutput,
  classifyIsolatedSessionExit,
  decodeGdbusString,
  makeResult,
  preflightEnvironment,
  waylandDisplayFromNiriSocket,
} from "./model"

interface CommandResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}

interface ChildState {
  readonly pid?: number
  readonly exitCode: number | null
  readonly signalCode: NodeJS.Signals | null
  kill(signal?: NodeJS.Signals): boolean
}

interface ManagedChild {
  readonly name: string
  readonly process: ChildState
  readonly exited: Promise<number>
  stop(): Promise<void>
}

class AcceptanceFailure extends Data.TaggedError("AcceptanceFailure")<{
  readonly status: "environment" | "harness" | "assertion" | "cleanup"
  readonly message: string
  readonly assertions?: ReadonlyArray<AssertionResult>
}> {}

const repositoryRoot = resolve(import.meta.dir, "../..")
const objectPath = "/me/pigmint/YatesUi/Debug"
const debugInterface = "me.pigmint.YatesUi.Debug1"
const runId =
  process.env.YATES_ACCEPTANCE_RUN_ID ??
  `${new Date()
    .toISOString()
    .replaceAll(/[^0-9]/g, "")
    .slice(0, 17)}-${crypto.randomUUID().slice(0, 8)}`
const artifactDir = resolve(
  process.env.YATES_ACCEPTANCE_ARTIFACT_DIR ?? `/tmp/yates-ui-acceptance/${runId}`,
)
const stderrPath = join(artifactDir, "stderr.jsonl")
const manifestPath = join(artifactDir, "manifest.json")
const resultPath = join(artifactDir, "result.json")
const children: ManagedChild[] = []

mkdirSync(artifactDir, { recursive: true })

function failure(
  status: AcceptanceFailure["status"],
  message: string,
  assertions?: ReadonlyArray<AssertionResult>,
): AcceptanceFailure {
  return new AcceptanceFailure({ status, message, assertions })
}

function appendEvent(source: string, line: string): void {
  if (!line.trim()) return
  appendFileSync(stderrPath, `${JSON.stringify({ ts: new Date().toISOString(), source, line })}\n`)
}

function tool(name: string): string | null {
  return Bun.which(name)
}

function tools(): ToolPaths {
  return {
    bun: tool("bun"),
    dbusRunSession: tool("dbus-run-session"),
    gdbus: tool("gdbus"),
    gjs: tool("gjs"),
    niri: tool("niri"),
    zenity: tool("zenity"),
    grim: tool("grim"),
    magick: tool("magick"),
  }
}

const runCommand = Effect.fn("acceptance.runCommand")(function* (
  command: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv = process.env,
  timeoutMs = 10_000,
) {
  return yield* Effect.tryPromise({
    try: async (): Promise<CommandResult> => {
      const child = Bun.spawn([...command], {
        cwd: repositoryRoot,
        env: environment,
        stdout: "pipe",
        stderr: "pipe",
      })
      const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs)
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      clearTimeout(timer)
      return { code, stdout, stderr }
    },
    catch: (cause) => failure("harness", `command failed to run: ${command[0]}: ${String(cause)}`),
  })
})

function streamLines(stream: NodeJS.ReadableStream, source: string, artifact?: string): void {
  let pending = ""
  stream.setEncoding("utf8")
  stream.on("data", (chunk: string) => {
    pending += chunk
    const lines = pending.split("\n")
    pending = lines.pop() ?? ""
    for (const line of lines) {
      appendEvent(source, line)
      if (artifact) appendFileSync(artifact, `${line}\n`)
    }
  })
  stream.on("end", () => {
    if (pending) appendEvent(source, pending)
  })
}

const acquireChild = Effect.fn("acceptance.acquireChild")(function* (
  name: string,
  command: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv,
  stdoutArtifact?: string,
) {
  return yield* Effect.acquireRelease(
    Effect.try({
      try: () => {
        const child = spawn(command[0] ?? "", command.slice(1), {
          cwd: repositoryRoot,
          env: environment,
          stdio: ["ignore", "pipe", "pipe"],
        })
        streamLines(child.stdout, `${name}.stdout`, stdoutArtifact)
        streamLines(child.stderr, `${name}.stderr`)
        let stopPromise: Promise<void> | null = null
        const exited = new Promise<number>((complete) => {
          child.once("exit", (code) => complete(code ?? 128))
        })
        const managed: ManagedChild = {
          name,
          process: child,
          exited,
          stop: () => {
            if (stopPromise) return stopPromise
            stopPromise = (async () => {
              if (child.exitCode !== null || child.signalCode !== null) return
              child.kill("SIGTERM")
              const graceful = await Promise.race([
                exited.then(() => true),
                Bun.sleep(2_000).then(() => false),
              ])
              if (!graceful && child.exitCode === null && child.signalCode === null) {
                child.kill("SIGKILL")
                await exited
              }
            })()
            return stopPromise
          },
        }
        children.push(managed)
        return managed
      },
      catch: (cause) => failure("harness", `failed to start ${name}: ${String(cause)}`),
    }),
    (child) => Effect.promise(() => child.stop()),
  )
})

function waitUntil<A>(
  description: string,
  operation: () => Effect.Effect<A | null, AcceptanceFailure>,
  timeoutMs = 10_000,
): Effect.Effect<A, AcceptanceFailure> {
  return Effect.gen(function* () {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      const value = yield* operation()
      if (value !== null) return value
      yield* Effect.sleep("100 millis")
    }
    return yield* failure("environment", `timed out waiting for ${description}`)
  })
}

function niriSocketForPid(pid: number): string | null {
  const runtime = process.env.XDG_RUNTIME_DIR
  if (!runtime) return null
  const suffix = `.${pid}.sock`
  const candidate = readdirSync(runtime)
    .filter((entry) => entry.startsWith("niri.") && entry.endsWith(suffix))
    .map((entry) => join(runtime, entry))
    .find((path) => statSync(path).isSocket())
  return candidate ?? null
}

function dbusCall(
  environment: NodeJS.ProcessEnv,
  busName: string,
  method: string,
  args: ReadonlyArray<string> = [],
): Effect.Effect<string, AcceptanceFailure> {
  return runCommand(
    [
      "gdbus",
      "call",
      "--session",
      "--dest",
      busName,
      "--object-path",
      objectPath,
      "--method",
      `${debugInterface}.${method}`,
      ...args,
    ],
    environment,
    3_000,
  ).pipe(
    Effect.flatMap((result) => {
      if (result.code !== 0) return Effect.fail(failure("harness", result.stderr.trim()))
      const value = decodeGdbusString(result.stdout)
      return value === null
        ? Effect.fail(failure("harness", `unexpected gdbus output: ${result.stdout.trim()}`))
        : Effect.succeed(value)
    }),
  )
}

function snapshot(
  environment: NodeJS.ProcessEnv,
  busName: string,
  name: string,
): Effect.Effect<Schema.Schema.Type<typeof DebugSnapshot>, AcceptanceFailure> {
  return dbusCall(environment, busName, "GetSnapshot").pipe(
    Effect.flatMap((json) => {
      const decoded = Schema.decodeUnknownEither(Schema.parseJson(DebugSnapshot))(json)
      if (Either.isLeft(decoded)) {
        return Effect.fail(failure("harness", `invalid debug snapshot: ${decoded.left}`))
      }
      writeFileSync(
        join(artifactDir, `dbus-${name}.json`),
        `${JSON.stringify(decoded.right, null, 2)}\n`,
      )
      return Effect.succeed(decoded.right)
    }),
  )
}

const runNested = Effect.fn("acceptance.runNested")(function* () {
  const available = tools()
  const preflight = preflightEnvironment({
    tools: available,
    waylandDisplay: process.env.WAYLAND_DISPLAY,
    xdgRuntimeDir: process.env.XDG_RUNTIME_DIR,
    insideSession: true,
    dbusSessionBusAddress: process.env.DBUS_SESSION_BUS_ADDRESS,
  })
  writeFileSync(
    join(artifactDir, "preflight.json"),
    `${JSON.stringify({ ...preflight, tools: available }, null, 2)}\n`,
  )
  if (!preflight.ok) return yield* failure("environment", preflight.failures.join("; "))

  const configPath = join(artifactDir, "niri.kdl")
  writeFileSync(
    configPath,
    `hotkey-overlay {
  skip-at-startup
}
prefer-no-csd
layout {
  gaps 0
}
`,
  )
  const validation = yield* runCommand(["niri", "validate", "-c", configPath])
  writeFileSync(
    join(artifactDir, "niri-config-validation.txt"),
    validation.stdout + validation.stderr,
  )
  if (validation.code !== 0) {
    return yield* failure("harness", "generated nested Niri config is invalid")
  }

  const build = yield* runCommand(["bun", "run", "build"], process.env, 60_000)
  writeFileSync(join(artifactDir, "build.log"), build.stdout + build.stderr)
  if (build.code !== 0) return yield* failure("assertion", "application build failed")
  const distEntries = readdirSync(join(repositoryRoot, "dist"))
  const appBundles = distEntries.filter(
    (entry) => entry.startsWith("app-") && entry.endsWith(".js"),
  )
  if (appBundles.length !== 1) {
    return yield* failure(
      "harness",
      `expected one production app bundle, found ${appBundles.length}`,
    )
  }
  const appBundle = join(repositoryRoot, "dist", "runtime.js")
  if (!distEntries.includes("runtime.js")) {
    return yield* failure("harness", "production runtime entry was not produced")
  }

  const niri = yield* acquireChild("niri", ["niri", "-c", configPath], process.env)
  const niriSocket = yield* waitUntil("nested Niri IPC socket", () =>
    Effect.sync(() => niriSocketForPid(niri.process.pid ?? -1)),
  )
  const nestedDisplay = waylandDisplayFromNiriSocket(niriSocket)
  if (!nestedDisplay) return yield* failure("harness", "nested Wayland display was not derivable")

  const applicationId = `me.pigmint.yates_ui.Acceptance.r${runId.replaceAll(/[^A-Za-z0-9_]/g, "_")}`
  const nestedEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    NIRI_SOCKET: niriSocket,
    WAYLAND_DISPLAY: nestedDisplay,
    YATES_APPLICATION_ID: applicationId,
    YATES_DEBUG: "1",
    YATES_FIXTURE_MODE: "1",
    YATES_RUN_ID: runId,
    GSETTINGS_BACKEND: "memory",
    LD_PRELOAD: "/usr/lib/libgtk4-layer-shell.so",
  }
  writeFileSync(
    join(artifactDir, "nested-environment.json"),
    `${JSON.stringify({ NIRI_SOCKET: niriSocket, WAYLAND_DISPLAY: nestedDisplay }, null, 2)}\n`,
  )
  yield* acquireChild(
    "niri-events",
    ["niri", "msg", "-j", "event-stream"],
    nestedEnvironment,
    join(artifactDir, "niri-events.jsonl"),
  )
  const app = yield* acquireChild("app", ["gjs", "-m", appBundle], nestedEnvironment)
  const busName = `me.pigmint.YatesUi.Debug.r${runId.replaceAll(/[^A-Za-z0-9_]/g, "_")}`

  const firstSnapshot = yield* waitUntil("debug Ping and ready snapshot", () =>
    app.process.exitCode !== null || app.process.signalCode !== null
      ? Effect.fail(failure("assertion", "application exited before debug readiness"))
      : dbusCall(nestedEnvironment, busName, "Ping").pipe(
          Effect.flatMap(() => snapshot(nestedEnvironment, busName, "ready")),
          Effect.map((value) => (value.ready && value.niri.connected ? value : null)),
          Effect.catchAll(() => Effect.succeed(null)),
        ),
  )

  const before = yield* runCommand(["niri", "msg", "-j", "layers"], nestedEnvironment)
  writeFileSync(join(artifactDir, "niri-layers-before.json"), before.stdout)
  const layersBefore = Schema.decodeUnknownEither(Schema.parseJson(NiriLayers))(before.stdout)
  if (Either.isLeft(layersBefore)) {
    return yield* failure("harness", `invalid Niri layer response: ${layersBefore.left}`)
  }

  const activation = yield* runCommand(["gjs", "-m", appBundle], nestedEnvironment)
  writeFileSync(join(artifactDir, "repeated-activation.log"), activation.stdout + activation.stderr)
  const afterActivation = yield* waitUntil("second activation", () =>
    snapshot(nestedEnvironment, busName, "after-activation").pipe(
      Effect.map((value) => (value.activationCount >= 2 ? value : null)),
    ),
  )

  const quickSettingsOutput = afterActivation.outputs[0]?.connector
  if (!quickSettingsOutput) return yield* failure("assertion", "no output for quick settings")
  const openQuickSettings = yield* dbusCall(nestedEnvironment, busName, "OpenQuickSettings", [
    quickSettingsOutput,
  ])
  if (!openQuickSettings.includes('"ok":true')) {
    return yield* failure("assertion", `OpenQuickSettings failed: ${openQuickSettings}`)
  }
  const quickSettingsVisible = yield* waitUntil("quick settings visible", () =>
    snapshot(nestedEnvironment, busName, "quick-settings-visible").pipe(
      Effect.map((value) =>
        value.outputs.some(
          (output) => output.connector === quickSettingsOutput && output.quickSettingsVisible,
        )
          ? value
          : null,
      ),
    ),
  )
  const setQuickSettingsVolume = yield* dbusCall(
    nestedEnvironment,
    busName,
    "SetQuickSettingsVolume",
    ["0.25"],
  )
  if (!setQuickSettingsVolume.includes('"ok":true')) {
    return yield* failure("assertion", `SetQuickSettingsVolume failed: ${setQuickSettingsVolume}`)
  }
  const quickSettingsVolume = yield* waitUntil("quick settings volume", () =>
    snapshot(nestedEnvironment, busName, "quick-settings-volume").pipe(
      Effect.map((value) => (value.quickSettings.volume === 0.25 ? value : null)),
    ),
  )
  if (available.grim) {
    const quickSettingsScreenshot = yield* runCommand(
      ["grim", "-c", join(artifactDir, "quick-settings.png")],
      nestedEnvironment,
    )
    writeFileSync(
      join(artifactDir, "quick-settings-grim.log"),
      quickSettingsScreenshot.stdout + quickSettingsScreenshot.stderr,
    )
  }

  const navigateQuickSettings = yield* dbusCall(
    nestedEnvironment,
    busName,
    "NavigateQuickSettings",
    [quickSettingsOutput, "wifi"],
  )
  if (!navigateQuickSettings.includes('"ok":true')) {
    return yield* failure("assertion", `NavigateQuickSettings failed: ${navigateQuickSettings}`)
  }
  const quickSettingsWifiPage = yield* waitUntil("quick settings Wi-Fi page", () =>
    snapshot(nestedEnvironment, busName, "quick-settings-wifi-page").pipe(
      Effect.map((value) =>
        value.outputs.some(
          (output) =>
            output.connector === quickSettingsOutput &&
            output.quickSettingsVisible &&
            output.quickSettingsPage === "wifi",
        )
          ? value
          : null,
      ),
    ),
  )
  if (available.grim) {
    const quickSettingsWifiScreenshot = yield* runCommand(
      ["grim", "-c", join(artifactDir, "quick-settings-wifi.png")],
      nestedEnvironment,
    )
    writeFileSync(
      join(artifactDir, "quick-settings-wifi-grim.log"),
      quickSettingsWifiScreenshot.stdout + quickSettingsWifiScreenshot.stderr,
    )
  }

  const openSettings = yield* runCommand(["gjs", "-m", appBundle, "--settings"], nestedEnvironment)
  writeFileSync(join(artifactDir, "settings-entry.log"), openSettings.stdout + openSettings.stderr)
  if (openSettings.code !== 0) {
    return yield* failure("assertion", `settings command failed: ${openSettings.stderr}`)
  }
  const settingsVisible = yield* waitUntil("settings window visible", () =>
    snapshot(nestedEnvironment, busName, "settings-visible").pipe(
      Effect.map((value) => (value.settings.visible ? value : null)),
    ),
  )
  const setOrientation = yield* dbusCall(nestedEnvironment, busName, "SetBarOrientation", [
    "horizontal",
  ])
  if (!setOrientation.includes('"ok":true')) {
    return yield* failure("assertion", `SetBarOrientation failed: ${setOrientation}`)
  }
  const horizontalBars = yield* waitUntil("horizontal setting applied", () =>
    snapshot(nestedEnvironment, busName, "settings-horizontal").pipe(
      Effect.map((value) =>
        value.settings.barOrientation === "horizontal" &&
        value.outputs.length > 0 &&
        value.outputs.every((output) => output.orientation === "horizontal")
          ? value
          : null,
      ),
    ),
  )

  yield* acquireChild(
    "fixture-window",
    ["zenity", "--info", "--title", "Yates acceptance fixture", "--text", "Fixture window"],
    nestedEnvironment,
  )
  const popupInput = yield* waitUntil("fixture window in Niri state", () =>
    snapshot(nestedEnvironment, busName, "fixture-ready").pipe(
      Effect.map((value) =>
        value.niri.windowIds.length > 0 && value.niri.workspaceIds.length > 0 ? value : null,
      ),
    ),
  )
  const connector = popupInput.outputs[0]?.connector
  const workspaceId = popupInput.niri.focusedWorkspaceId ?? popupInput.niri.workspaceIds[0]
  if (!connector || workspaceId === undefined) {
    return yield* failure("assertion", "no output/workspace available for popup assertion")
  }
  const enter = yield* dbusCall(nestedEnvironment, busName, "WorkspaceEnter", [
    connector,
    String(workspaceId),
  ])
  if (!enter.includes('"ok":true')) {
    return yield* failure("assertion", `WorkspaceEnter failed: ${enter}`)
  }
  const popupVisible = yield* snapshot(nestedEnvironment, busName, "popup-visible")
  yield* dbusCall(nestedEnvironment, busName, "Reset")
  const popupReset = yield* snapshot(nestedEnvironment, busName, "popup-reset")

  const after = yield* runCommand(["niri", "msg", "-j", "layers"], nestedEnvironment)
  writeFileSync(join(artifactDir, "niri-layers-after.json"), after.stdout)
  const layersAfter = Schema.decodeUnknownEither(Schema.parseJson(NiriLayers))(after.stdout)
  if (Either.isLeft(layersAfter)) {
    return yield* failure("harness", "invalid post-activation Niri layers")
  }

  const assertions: AssertionResult[] = [
    assertOneBarPerOutput(
      firstSnapshot.outputs.map((output) => output.connector),
      layersBefore.right,
    ),
    {
      name: "debug-control-ready",
      ok: firstSnapshot.ready && firstSnapshot.niri.connected,
      detail: `pid=${firstSnapshot.pid}, niriSequence=${firstSnapshot.niri.sequence}`,
    },
    {
      name: "repeated-activation-does-not-duplicate",
      ok:
        afterActivation.outputs.length === firstSnapshot.outputs.length &&
        assertOneBarPerOutput(
          afterActivation.outputs.map((output) => output.connector),
          layersAfter.right,
        ).ok,
      detail: `activationCount=${afterActivation.activationCount}, bars=${afterActivation.outputs.length}, helperExit=${activation.code}`,
    },
    {
      name: "quick-settings-dbus-transition",
      ok:
        quickSettingsVisible.outputs.some(
          (output) => output.connector === quickSettingsOutput && output.quickSettingsVisible,
        ) &&
        quickSettingsVolume.quickSettings.volume === 0.25 &&
        quickSettingsWifiPage.outputs.some(
          (output) =>
            output.connector === quickSettingsOutput && output.quickSettingsPage === "wifi",
        ),
      detail: `connector=${quickSettingsOutput}, volume=${quickSettingsVolume.quickSettings.volume}, page=wifi`,
    },
    {
      name: "settings-command-opens-and-persists-orientation",
      ok:
        settingsVisible.settings.visible &&
        horizontalBars.settings.barOrientation === "horizontal" &&
        horizontalBars.outputs.every((output) => output.orientation === "horizontal"),
      detail: `visible=${settingsVisible.settings.visible}, orientation=${horizontalBars.settings.barOrientation}, bars=${horizontalBars.outputs.length}`,
    },
    {
      name: "popup-dbus-transition",
      ok:
        popupVisible.outputs.some(
          (output) =>
            output.connector === connector &&
            output.popupVisible &&
            output.popupWorkspaceId === workspaceId,
        ) &&
        popupReset.outputs.every(
          (output) => !output.popupVisible && output.popupWorkspaceId === null,
        ),
      detail: `connector=${connector}, workspace=${workspaceId}`,
    },
  ]

  if (available.grim && available.magick) {
    const screenshotPath = join(artifactDir, "nested-output.png")
    const screenshot = yield* runCommand(["grim", "-c", screenshotPath], nestedEnvironment)
    writeFileSync(join(artifactDir, "grim.log"), screenshot.stdout + screenshot.stderr)
    const identify = yield* runCommand(
      ["magick", screenshotPath, "-format", "%w %h %[fx:standard_deviation]", "info:"],
      nestedEnvironment,
    )
    const [widthText, heightText, deviationText] = identify.stdout.trim().split(/\s+/)
    const width = Number(widthText)
    const height = Number(heightText)
    const standardDeviation = Number(deviationText)
    const visualOk =
      screenshot.code === 0 &&
      identify.code === 0 &&
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0 &&
      Number.isFinite(standardDeviation) &&
      standardDeviation > 0.001
    writeFileSync(
      join(artifactDir, "screenshot-metadata.json"),
      `${JSON.stringify({ width, height, standardDeviation, nonblank: standardDeviation > 0.001, bounds: { x: 0, y: 0, width, height } }, null, 2)}\n`,
    )
    assertions.push({
      name: "screenshot-nonblank-and-bounded",
      ok: visualOk,
      detail: `width=${width}, height=${height}, standardDeviation=${standardDeviation}`,
    })
  } else {
    assertions.push({
      name: "screenshot-nonblank-and-bounded",
      ok: true,
      detail: `skipped; optional tools unavailable: ${preflight.optionalUnavailable.join(", ")}`,
    })
  }

  const failed = assertions.filter((assertion) => !assertion.ok)
  if (failed.length > 0) {
    return yield* failure(
      "assertion",
      `application assertions failed: ${failed.map((assertion) => assertion.name).join(", ")}`,
      assertions,
    )
  }
  return { assertions, evidence: { manifest: manifestPath, stderr: stderrPath } }
})

const AcceptanceResultSchema = Schema.Struct({
  type: Schema.Literal("yates-ui-acceptance"),
  version: Schema.Literal(1),
  runId: Schema.String,
  ok: Schema.Boolean,
  status: Schema.Literal("pass", "environment", "harness", "assertion", "cleanup"),
  exitCode: Schema.Number,
  artifactDir: Schema.String,
  assertions: Schema.Array(
    Schema.Struct({ name: Schema.String, ok: Schema.Boolean, detail: Schema.String }),
  ),
  evidence: Schema.Record({ key: Schema.String, value: Schema.String }),
  message: Schema.String,
  mutations: Schema.Array(Schema.String),
})

async function outerRun(): Promise<AcceptanceResult> {
  const available = tools()
  const preflight = preflightEnvironment({
    tools: available,
    waylandDisplay: process.env.WAYLAND_DISPLAY,
    xdgRuntimeDir: process.env.XDG_RUNTIME_DIR,
    insideSession: false,
    dbusSessionBusAddress: process.env.DBUS_SESSION_BUS_ADDRESS,
  })
  if (!preflight.ok) {
    return makeResult(runId, artifactDir, "environment", preflight.failures.join("; "))
  }
  const child = Bun.spawn(
    [
      available.dbusRunSession ?? "dbus-run-session",
      "--",
      available.bun ?? "bun",
      resolve(import.meta.path),
      "--inside-session",
    ],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        YATES_ACCEPTANCE_RUN_ID: runId,
        YATES_ACCEPTANCE_ARTIFACT_DIR: artifactDir,
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  )
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  writeFileSync(join(artifactDir, "isolated-session.stdout.log"), stdout)
  if (stderr.trim()) appendEvent("dbus-session.stderr", stderr.trim())
  const resultLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1)
  const decoded = Schema.decodeUnknownEither(Schema.parseJson(AcceptanceResultSchema))(
    resultLine ?? "",
  )
  if (Either.isRight(decoded)) return decoded.right
  appendEvent("outer.parse", String(decoded.left))
  return makeResult(
    runId,
    artifactDir,
    classifyIsolatedSessionExit(code),
    `isolated D-Bus session did not start cleanly (exit ${code}); see stderr.jsonl`,
    [],
    { manifest: manifestPath, stderr: stderrPath },
  )
}

async function insideRun(): Promise<AcceptanceResult> {
  const outcome = await Effect.runPromise(
    Effect.scoped(runNested()).pipe(
      Effect.match({
        onFailure: (failed) => Either.left(failed),
        onSuccess: (succeeded) => Either.right(succeeded),
      }),
    ),
  )
  const cleanupFailures = children.filter(
    (child) => child.process.exitCode === null && child.process.signalCode === null,
  )
  if (cleanupFailures.length > 0) {
    return makeResult(
      runId,
      artifactDir,
      "cleanup",
      `child cleanup failed: ${cleanupFailures.map((child) => child.name).join(", ")}`,
      [{ name: "clean-teardown", ok: false, detail: "one or more children remained" }],
    )
  }
  if (Either.isLeft(outcome)) {
    return makeResult(
      runId,
      artifactDir,
      outcome.left.status,
      outcome.left.message,
      outcome.left.assertions ?? [],
    )
  }
  return makeResult(
    runId,
    artifactDir,
    "pass",
    "nested acceptance passed",
    [
      ...outcome.right.assertions,
      {
        name: "clean-teardown",
        ok: true,
        detail: `${children.length} scoped child process(es) exited`,
      },
    ],
    outcome.right.evidence,
  )
}

const insideSession = process.argv.includes("--inside-session")
writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      type: "yates-ui-acceptance-manifest",
      version: 1,
      runId,
      artifactDir,
      repositoryRoot,
      startedAt: new Date().toISOString(),
      mode: "nested-niri",
      isolatedDbus: true,
      fixtureMode: true,
      debug: true,
      liveSessionMutations: [],
    },
    null,
    2,
  )}\n`,
)
chmodSync(artifactDir, 0o700)

const result = insideSession ? await insideRun() : await outerRun()
writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(result)}\n`)
process.exitCode = result.exitCode
