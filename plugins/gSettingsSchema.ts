import { execFile } from "node:child_process"
import { copyFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { Plugin } from "rolldown"

const execFileAsync = promisify(execFile)

export function gSettingsSchema({ schemaFile }: { schemaFile: string }): Plugin {
  return {
    name: "gsettings-schema",
    buildStart() {
      this.addWatchFile(schemaFile)
    },
    async writeBundle(options) {
      const outputDirectory = path.resolve(options.dir ?? "dist")
      const schemaDirectory = path.join(outputDirectory, "schemas")
      await mkdir(schemaDirectory, { recursive: true })
      await copyFile(schemaFile, path.join(schemaDirectory, path.basename(schemaFile)))
      await execFileAsync("glib-compile-schemas", [schemaDirectory])
    },
  }
}
