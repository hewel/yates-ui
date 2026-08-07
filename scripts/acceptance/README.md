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

Stdout contains exactly one compact JSON result. Exit codes are `0` for pass,
`2` for unavailable environment or nested-compositor startup, `3` for harness
or input failure, `4` for an application assertion, and `5` for cleanup
failure.

Evidence is stored in `/tmp/yates-ui-acceptance/<run-id>/`. It includes the
manifest and result, structured stderr, Niri events and layer snapshots, D-Bus
snapshots, and build/config logs. When `grim` and ImageMagick are available, it
also includes a `grim -c` PNG and metadata for nonblank and image-bound checks;
visual assertions intentionally use no golden images.
