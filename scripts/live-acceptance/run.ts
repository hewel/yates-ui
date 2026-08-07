#!/usr/bin/env bun

import { Either, Schema } from "effect"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { decodeGdbusString } from "../acceptance/model"

const root = resolve(import.meta.dir, "../..")
const runId =
  process.env.YATES_ACCEPTANCE_RUN_ID ??
  `live-${new Date()
    .toISOString()
    .replaceAll(/[^0-9]/g, "")
    .slice(0, 17)}`
const artifactDir = resolve(
  process.env.YATES_ACCEPTANCE_ARTIFACT_DIR ?? `/tmp/yates-ui-acceptance/${runId}`,
)
const stateDir = join(artifactDir, "vmouse")
const busSuffix = runId.replaceAll(/[^A-Za-z0-9_]/g, "_")
const busName = `me.pigmint.YatesUi.Debug.r${busSuffix}`
const objectPath = "/me/pigmint/YatesUi/Debug"
mkdirSync(stateDir, { recursive: true })

type Status = "pass" | "environment" | "harness" | "assertion" | "cleanup"
const exitCode: Readonly<Record<Status, number>> = {
  pass: 0,
  environment: 2,
  harness: 3,
  assertion: 4,
  cleanup: 5,
}

const PointerEvent = Schema.Union(
  Schema.Struct({ type: Schema.Literal("workspace-enter"), workspaceId: Schema.Number }),
  Schema.Struct({ type: Schema.Literal("workspace-leave", "popup-enter", "popup-leave") }),
)
const Snapshot = Schema.Struct({
  ready: Schema.Boolean,
  outputs: Schema.Array(
    Schema.Struct({
      connector: Schema.String,
      popupVisible: Schema.Boolean,
      lastPointerEvent: Schema.NullOr(PointerEvent),
    }),
  ),
})
const Layers = Schema.Array(
  Schema.Struct({
    namespace: Schema.String,
    output: Schema.String,
  }),
)

interface CommandResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}

async function command(
  args: string[],
  environment = process.env,
  timeoutMs = 10_000,
): Promise<CommandResult> {
  const child = Bun.spawn(args, {
    cwd: root,
    env: environment,
    stdout: "pipe",
    stderr: "pipe",
  })
  const timeout = setTimeout(() => child.kill("SIGKILL"), timeoutMs)
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  clearTimeout(timeout)
  return { code, stdout, stderr }
}

async function snapshot(environment: NodeJS.ProcessEnv) {
  const result = await command(
    [
      "gdbus",
      "call",
      "--session",
      "--dest",
      busName,
      "--object-path",
      objectPath,
      "--method",
      "me.pigmint.YatesUi.Debug1.GetSnapshot",
    ],
    environment,
  )
  if (result.code !== 0) return null
  const json = decodeGdbusString(result.stdout)
  if (!json) return null
  const decoded = Schema.decodeUnknownEither(Schema.parseJson(Snapshot))(json)
  return Either.isRight(decoded) ? decoded.right : null
}

async function waitForSnapshot(environment: NodeJS.ProcessEnv, timeoutMs = 10_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = await snapshot(environment)
    if (value?.ready) return value
    await Bun.sleep(100)
  }
  return null
}

function result(status: Status, message: string, evidence: Record<string, string> = {}) {
  return {
    type: "yates-ui-acceptance",
    version: 1,
    mode: "live",
    runId,
    ok: status === "pass",
    status,
    exitCode: exitCode[status],
    artifactDir,
    message,
    evidence,
    mutations: [],
  }
}

async function main() {
  writeFileSync(
    join(artifactDir, "manifest.json"),
    `${JSON.stringify({ runId, mode: "live", startedAt: new Date().toISOString(), mutations: [] }, null, 2)}\n`,
  )
  const preflight = await command(["python3", join(root, "scripts/live-acceptance/preflight.py")])
  writeFileSync(join(artifactDir, "preflight.json"), preflight.stdout)
  if (preflight.code !== 0) {
    return result("environment", "live preflight rejected environmental interference", {
      preflight: join(artifactDir, "preflight.json"),
    })
  }

  const build = await command(["bun", "run", "build"])
  writeFileSync(join(artifactDir, "build.log"), build.stdout + build.stderr)
  if (build.code !== 0) return result("assertion", "application build failed")

  const setup = await command([join(root, "scripts/live-acceptance/setup.sh"), stateDir])
  writeFileSync(join(artifactDir, "vmouse-setup.log"), setup.stdout + setup.stderr)
  if (setup.code !== 0) return result("harness", "persistent virtual pointer failed to start")

  const vmousePid = Number(readFileSync(join(stateDir, "vmouse.pid"), "utf8"))
  const vmouseScript = join(root, "scripts/live-acceptance/vmouse.py")
  const vmouseIsAlive = () => {
    try {
      process.kill(vmousePid, 0)
      return true
    } catch {
      return false
    }
  }
  const assertOwnedVmouse = () => {
    const commandLine = readFileSync(`/proc/${vmousePid}/cmdline`, "utf8").replaceAll("\0", " ")
    if (!commandLine.includes(vmouseScript)) {
      throw new Error(`refusing to signal pid ${vmousePid}; it is no longer this run's vmouse`)
    }
  }
  const terminateOwnedVmouse = async () => {
    if (!vmouseIsAlive()) return
    assertOwnedVmouse()
    process.kill(vmousePid, "SIGTERM")
    const started = Date.now()
    while (Date.now() - started < 2_000 && vmouseIsAlive()) await Bun.sleep(20)
    if (vmouseIsAlive()) {
      assertOwnedVmouse()
      process.kill(vmousePid, "SIGKILL")
      const killedAt = Date.now()
      while (Date.now() - killedAt < 2_000 && vmouseIsAlive()) await Bun.sleep(20)
    }
    if (vmouseIsAlive()) throw new Error(`owned vmouse pid ${vmousePid} survived SIGKILL`)
  }

  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    YATES_APPLICATION_ID: `me.pigmint.yates_ui.Live.r${busSuffix}`,
    YATES_DEBUG: "1",
    YATES_RUN_ID: runId,
    LD_PRELOAD: "/usr/lib/libgtk4-layer-shell.so",
  }
  const launchApp = () => {
    const process = Bun.spawn(["gjs", "-m", join(root, "dist/runtime.js")], {
      cwd: root,
      env: environment,
      stdout: "pipe",
      stderr: "pipe",
    })
    return {
      process,
      stdout: new Response(process.stdout).text(),
      stderr: new Response(process.stderr).text(),
    }
  }
  let launchedApp: ReturnType<typeof launchApp>
  try {
    launchedApp = launchApp()
  } catch (cause) {
    try {
      await terminateOwnedVmouse()
    } catch (cleanupCause) {
      return result(
        "cleanup",
        `app launch failed: ${String(cause)}; vmouse: ${String(cleanupCause)}`,
      )
    }
    return result("harness", `app launch failed: ${String(cause)}`)
  }
  const app = launchedApp.process
  const appStdout = launchedApp.stdout
  const appStderr = launchedApp.stderr
  let sequence = 0

  const assertDaemonAck = async (expectedSequence: number, requireAlive = true) => {
    const pid = Number(readFileSync(join(stateDir, "vmouse.pid"), "utf8"))
    if (requireAlive) {
      try {
        process.kill(pid, 0)
      } catch (cause) {
        throw new Error(`virtual pointer daemon died before seq ${expectedSequence}`, {
          cause,
        })
      }
    }
    const started = Date.now()
    while (Date.now() - started < 2_000) {
      const events = readFileSync(join(stateDir, "vmouse.events.jsonl"), "utf8")
      const acknowledged = events
        .split("\n")
        .filter(Boolean)
        .some((line) => {
          const decoded = Schema.decodeUnknownEither(
            Schema.parseJson(
              Schema.Struct({
                type: Schema.String,
                seq: Schema.Number,
                ok: Schema.Boolean,
              }),
            ),
          )(line)
          return (
            Either.isRight(decoded) &&
            decoded.right.type === "ack" &&
            decoded.right.seq === expectedSequence &&
            decoded.right.ok
          )
        })
      if (acknowledged) return
      await Bun.sleep(20)
    }
    throw new Error(`virtual pointer did not acknowledge seq ${expectedSequence}`)
  }

  const assertDaemonStopped = async (expectedSequence: number) => {
    const started = Date.now()
    while (Date.now() - started < 2_000) {
      const events = readFileSync(join(stateDir, "vmouse.events.jsonl"), "utf8")
      const stopped = events
        .split("\n")
        .filter(Boolean)
        .some((line) => {
          const decoded = Schema.decodeUnknownEither(
            Schema.parseJson(
              Schema.Struct({
                type: Schema.String,
                seq: Schema.Number,
                ok: Schema.Boolean,
              }),
            ),
          )(line)
          return (
            Either.isRight(decoded) &&
            decoded.right.type === "stopped" &&
            decoded.right.seq === expectedSequence &&
            decoded.right.ok
          )
        })
      if (stopped) return
      await Bun.sleep(20)
    }
    throw new Error(
      `virtual pointer did not confirm device destruction for seq ${expectedSequence}`,
    )
  }

  const runScenario = async () => {
    const ready = await waitForSnapshot(environment)
    if (!ready) return result("harness", "debug D-Bus did not become ready")
    const layers = await command(["niri", "msg", "-j", "layers"], environment)
    writeFileSync(join(artifactDir, "niri-layers.json"), layers.stdout)
    const decodedLayers = Schema.decodeUnknownEither(Schema.parseJson(Layers))(layers.stdout)
    if (Either.isLeft(decodedLayers)) return result("harness", "Niri layer JSON was invalid")
    const yatesLayers = decodedLayers.right.filter((layer) => layer.namespace === "yates-bar")
    const expectedOutputs = new Set(ready.outputs.map((output) => output.connector))
    const badOutputs = ready.outputs.filter(
      (output) => yatesLayers.filter((layer) => layer.output === output.connector).length !== 1,
    )
    const unexpectedOutputs = yatesLayers.filter((layer) => !expectedOutputs.has(layer.output))
    if (badOutputs.length > 0 || unexpectedOutputs.length > 0) {
      return result("assertion", "live compositor did not report one yates-bar per output")
    }

    const control = async (args: string[]) => {
      sequence += 1
      const [kind, ...values] = args
      if (!kind) throw new Error("virtual pointer command is empty")
      const sent = await command(
        [join(root, "scripts/live-acceptance/control.sh"), kind, String(sequence), ...values],
        { ...environment, YATES_LIVE_STATE_DIR: stateDir },
      )
      if (sent.code !== 0) throw new Error(`virtual pointer command failed: ${sent.stderr}`)
      await assertDaemonAck(sequence)
      return sent
    }
    await control(["heartbeat"])
    await control(["move", "-10000", "-10000"])

    let enteredConnector: string | null = null
    for (let step = 0; step < 180 && enteredConnector === null; step += 1) {
      await control(["move", step === 0 ? "8" : "0", "8"])
      await Bun.sleep(20)
      const current = await snapshot(environment)
      enteredConnector =
        current?.outputs.find(
          (output) => output.popupVisible && output.lastPointerEvent?.type === "workspace-enter",
        )?.connector ?? null
    }
    if (enteredConnector === null) {
      return result("harness", "pointer search never reached a populated workspace button")
    }

    const screenshotPath = join(artifactDir, "live-pointer.png")
    const captured = await command(["grim", "-c", screenshotPath], environment)
    if (captured.code !== 0) return result("harness", "grim -c capture failed")
    const visual = await command(
      ["magick", screenshotPath, "-format", "%w %h %[fx:standard_deviation]", "info:"],
      environment,
    )
    writeFileSync(join(artifactDir, "screenshot-metadata.txt"), visual.stdout)
    const [width, height, deviation] = visual.stdout.trim().split(/\s+/).map(Number)
    if (
      visual.code !== 0 ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      !Number.isFinite(deviation) ||
      deviation <= 0.001
    ) {
      return result("assertion", "live screenshot was blank or out of bounds")
    }

    await control(["move", "10000", "10000"])
    await Bun.sleep(300)
    const left = await snapshot(environment)
    const leaveObserved =
      left?.outputs.some(
        (output) =>
          output.connector === enteredConnector &&
          !output.popupVisible &&
          (output.lastPointerEvent?.type === "workspace-leave" ||
            output.lastPointerEvent?.type === "popup-leave"),
      ) ?? false
    if (!leaveObserved) return result("harness", "pointer leave was not delivered")

    return result("pass", "live pointer, compositor, D-Bus, and pixel evidence agree", {
      screenshot: screenshotPath,
      layers: join(artifactDir, "niri-layers.json"),
    })
  }

  const scenario = await runScenario().catch((cause) => result("harness", String(cause)))
  const cleanupFailures: string[] = []
  try {
    const stopped = await command(
      [join(root, "scripts/live-acceptance/control.sh"), "stop", String(++sequence)],
      { ...environment, YATES_LIVE_STATE_DIR: stateDir },
    )
    if (stopped.code !== 0) throw new Error(`virtual pointer stop failed: ${stopped.stderr}`)
    await assertDaemonAck(sequence, false)
    await assertDaemonStopped(sequence)
    const stopStarted = Date.now()
    while (Date.now() - stopStarted < 2_000) {
      try {
        process.kill(vmousePid, 0)
        await Bun.sleep(20)
      } catch {
        break
      }
    }
    try {
      process.kill(vmousePid, 0)
      throw new Error("virtual pointer daemon survived stop acknowledgement")
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes("survived")) throw cause
    }
  } catch (cause) {
    cleanupFailures.push(`vmouse: ${String(cause)}`)
    try {
      await terminateOwnedVmouse()
    } catch (fallbackCause) {
      cleanupFailures.push(`vmouse fallback: ${String(fallbackCause)}`)
    }
  }
  try {
    app.kill("SIGTERM")
    await Promise.race([app.exited, Bun.sleep(2_000)])
    if (app.exitCode === null) {
      app.kill("SIGKILL")
      await app.exited
    }
    writeFileSync(join(artifactDir, "app.stdout.log"), await appStdout)
    writeFileSync(join(artifactDir, "app.stderr.jsonl"), await appStderr)
  } catch (cause) {
    cleanupFailures.push(`app: ${String(cause)}`)
    if (app.exitCode === null) {
      try {
        app.kill("SIGKILL")
        await app.exited
      } catch (fallbackCause) {
        cleanupFailures.push(`app fallback: ${String(fallbackCause)}`)
      }
    }
  }
  try {
    const collected = await command([
      join(root, "scripts/live-acceptance/collect-artifacts.sh"),
      stateDir,
      join(artifactDir, "live-evidence"),
    ])
    if (collected.code !== 0) throw new Error("live artifact collection failed")
  } catch (cause) {
    cleanupFailures.push(`artifacts: ${String(cause)}`)
  }

  return cleanupFailures.length > 0 ? result("cleanup", cleanupFailures.join("; ")) : scenario
}

const outcome = await main().catch((cause) => result("harness", String(cause)))
writeFileSync(join(artifactDir, "result.json"), `${JSON.stringify(outcome, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(outcome)}\n`)
process.exitCode = outcome.exitCode
