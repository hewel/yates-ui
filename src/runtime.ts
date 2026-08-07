// Effect checks URL identity while hashing values, but GJS does not provide the
// browser URL constructor. The application does not construct URLs; this shim
// only makes the runtime type guard safe.
if (typeof globalThis.URL === "undefined") {
  Object.defineProperty(globalThis, "URL", {
    configurable: true,
    value: class GjsUrlShim {},
  })
}

await import("./app")

export {}
