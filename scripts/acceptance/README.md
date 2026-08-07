# Nested acceptance runner

Run from the repository root:

```sh
bun scripts/acceptance/run.ts
```

The runner builds the production bundle, enters an isolated `dbus-run-session`,
and starts a nested Niri without `--session`. It never reads or changes the live
Niri configuration and never stops live desktop processes. The app runs with
`YATES_FIXTURE_MODE=1`, `YATES_DEBUG=1`, a run-specific application ID, and a
run-specific debug D-Bus name.

The quick-settings phase launches all six deterministic fixture profiles
(`laptop`, `desktop`, `complex`, both lock-screen variants, and `empty-states`)
one at a time. It asserts that the popover opens for every profile and stores a
profile-specific screenshot when `grim` is available, while rechecking one bar
layer per output between profile processes. Inline detail navigation
uses the canonical `OpenQuickSettingsDetail` debug method; the older
`NavigateQuickSettings` method remains available only for compatibility. The
runner opens Wi-Fi, switches directly to Bluetooth, then closes only the inline
detail and verifies that the containing popover stays visible.

Stdout contains exactly one compact JSON result. Exit codes are `0` for pass,
`2` for unavailable environment or nested-compositor startup, `3` for harness
or input failure, `4` for an application assertion, and `5` for cleanup
failure.

Evidence is stored in `/tmp/yates-ui-acceptance/<run-id>/`. It includes the
manifest and result, structured stderr, Niri events and layer snapshots, D-Bus
snapshots, and build/config logs. When `grim` and ImageMagick are available, it
also includes a `grim -c` PNG and metadata for nonblank and image-bound checks;
visual assertions intentionally use no golden images.
