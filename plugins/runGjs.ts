import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"
import { Plugin } from "rolldown"

export function runGjs(): Plugin {
  let child: ChildProcess | null = null

  return {
    name: "run-gjs",
    writeBundle(options, bundle) {
      if (!this.meta.watchMode) return
      const chunk = Object.values(bundle).find((chunk) => chunk.type === "chunk")
      if (!chunk) return

      child?.kill("SIGTERM")
      child = spawn("gjs", ["-m", path.join(options.dir ?? "", chunk.fileName)], {
        stdio: "inherit",
        env: {
          ...process.env,
          // gtk4-layer-shell must be linked before libwayland-client;
          // as a GIR import it isn't, so preload it (see gtk4-layer-shell linking.md)
          LD_PRELOAD: "/usr/lib/libgtk4-layer-shell.so",
        },
      })
    },
  }
}
