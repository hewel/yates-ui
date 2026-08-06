import { Plugin } from "rolldown"

export function vanillaCssUrl({ fileName }: { fileName: string }): Plugin {
  return {
    name: "get-vanilla-css-url",
    resolveId(id) {
      if (id === "virtual:vanilla-bundle-url") {
        return "\0virtual:vanilla-bundle-url"
      }
    },
    load(id) {
      if (id === "\0virtual:vanilla-bundle-url") {
        // Resolve the CSS asset relative to this module's URL so `css` works
        // regardless of the process cwd. gjs has no `URL` global, so use
        // string ops on import.meta.url ("file:///…/dist/app.js").
        return [
          `const moduleDir = decodeURIComponent(import.meta.url.slice("file://".length, import.meta.url.lastIndexOf("/") + 1))`,
          `export default moduleDir + "__VANILLA_BUNDLE_URL_PLACEHOLDER__";`,
        ].join("\n")
      }
    },
    generateBundle(_options, bundle) {
      const cssAsset = Object.values(bundle).find(
        (asset) => asset.type === "asset" && asset.names.includes(fileName),
      )
      // Replace with the emitted asset path, or "" (falsy -> app.start skips css)
      const replacement = cssAsset ? `"${cssAsset.fileName}"` : `""`
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") {
          chunk.code = chunk.code.replace(
            /"__VANILLA_BUNDLE_URL_PLACEHOLDER__"/g,
            replacement,
          )
        }
      }
    },
  }
}
