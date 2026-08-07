# Persistent virtual pointer

`vmouse.py` creates one long-lived `/dev/uinput` device with a stable name,
physical path, and USB identity. It only advertises `REL_X` and `REL_Y`; live
checks must assert movement relative to the pointer's current position rather
than assuming screen coordinates.

Run `./scripts/live-acceptance/setup.sh [STATE_DIR]`. Preflight is read-only and
fails before startup when required tools or uinput permissions are missing, DMS
is running, or Niri reports an existing exclusive zone or competing bar, panel,
or dock layer. It records the evidence in `preflight.json`; it never kills a
process or changes configuration.

Send commands with increasing sequence numbers:

```sh
./scripts/live-acceptance/control.sh heartbeat 1
./scripts/live-acceptance/control.sh move 2 20 -10
./scripts/live-acceptance/control.sh stop 3
```

Set `YATES_LIVE_STATE_DIR` when using a non-default state directory. Setup uses
an OS `flock` for one owner per state directory and reaps the daemon if startup
does not reach readiness. The daemon emits a `ready` event, one `ack` per
accepted command, and a final `stopped` event only after device destruction to
`vmouse.events.jsonl`. Protocol/device failures are JSON objects with `ok:false`,
`code`, and `message`. `collect-artifacts.sh` copies those logs and captures
read-only process, Niri layer, and `/dev/uinput` evidence.
