import { spawn, type ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import path from "node:path"
import { Plugin } from "rolldown"

export function runGjs(): Plugin {
  let child: ChildProcess | null = null
  let restart = Promise.resolve()
  let lockPath: string | null = null
  let lockChild: ChildProcess | null = null

  const stopChild = async () => {
    const running = child
    child = null
    if (!running || running.exitCode !== null) return

    running.kill("SIGTERM")
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (running.exitCode === null) running.kill("SIGKILL")
      }, 2_000)
      running.once("exit", () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  const acquireLock = async () => {
    const key = createHash("sha256").update(process.cwd()).digest("hex").slice(0, 12)
    lockPath = `/tmp/yates-ui-run-gjs-${key}.lock`
    const locker = spawn(
      "flock",
      [
        "-F",
        "--nonblock",
        "--conflict-exit-code",
        "73",
        lockPath,
        "sh",
        "-c",
        "printf 'ready\\n'; exec sleep infinity",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    )
    await new Promise<void>((resolve, reject) => {
      let ready = false
      locker.stdout?.on("data", (chunk) => {
        if (!ready && String(chunk).includes("ready")) {
          ready = true
          lockChild = locker
          resolve()
        }
      })
      locker.once("error", (cause) => reject(cause))
      locker.once("exit", (code) => {
        if (lockChild === locker) lockChild = null
        if (!ready)
          reject(new Error(`Another yates-ui watcher owns ${lockPath} (flock exit ${code})`))
      })
    })
  }

  const releaseLock = async () => {
    const locker = lockChild
    lockChild = null
    if (!locker || locker.exitCode !== null || locker.signalCode !== null) return
    locker.kill("SIGTERM")
    await new Promise<void>((resolve) => locker.once("exit", () => resolve()))
  }

  return {
    name: "run-gjs",
    async buildStart() {
      if (this.meta.watchMode && !lockChild) await acquireLock()
    },
    async writeBundle(options, bundle) {
      if (!this.meta.watchMode) return
      const chunk = Object.values(bundle).find((chunk) => chunk.type === "chunk" && chunk.isEntry)
      if (!chunk) return

      restart = restart.then(async () => {
        await stopChild()
        const next = spawn("gjs", ["-m", path.join(options.dir ?? "", chunk.fileName)], {
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            YATES_RUN_ID: `watch-${Date.now()}`,
            // gtk4-layer-shell must be linked before libwayland-client;
            // as a GIR import it isn't, so preload it (see gtk4-layer-shell linking.md)
            LD_PRELOAD: "/usr/lib/libgtk4-layer-shell.so",
          },
        })
        child = next
        next.stdout?.on("data", (chunk) => process.stdout.write(chunk))
        next.stderr?.on("data", (chunk) => process.stderr.write(chunk))
        next.once("exit", (code, signal) => {
          if (child === next) child = null
          if (code !== 0 && signal !== "SIGTERM") {
            process.stderr.write(`${JSON.stringify({ event: "watch.gjs.exit", code, signal })}\n`)
          }
        })
      })
      await restart
    },
    async closeWatcher() {
      await stopChild()
      await releaseLock()
    },
  }
}
