import { vanillaExtractPlugin } from "@vanilla-extract/rollup-plugin"
import { defineConfig } from "rolldown"
import esbuild from "rollup-plugin-esbuild"

import { gSettingsSchema } from "./plugins/gSettingsSchema"
import { runGjs } from "./plugins/runGjs"
import { vanillaCssUrl } from "./plugins/vanillaCssUrl"

export default defineConfig({
  platform: "neutral",
  input: "src/runtime.ts",
  watch: {
    include: ["src/**/*"],
    exclude: ["node_modules/**", "dist/**"],
  },
  output: {
    dir: "./dist",
    cleanDir: true,
    format: "esm",
  },
  external: [/^gi:\/\//, /^resource:\/\//, "system", "gettext", "console"],
  plugins: [
    esbuild({
      target: "es2022",

      // Transform JSX for AGS
      jsx: "automatic",
      jsxImportSource: "gnim/gtk4",

      // Crucial for GObject.Object registration: prevents class names from being mangled
      keepNames: true,
      minifySyntax: true,
    }),
    vanillaExtractPlugin({
      extract: {
        name: "style.css",
      },
    }),
    vanillaCssUrl({ fileName: "style.css" }),
    gSettingsSchema({ schemaFile: "data/me.pigmint.yates-ui.gschema.xml" }),
    runGjs(),
  ],
})
