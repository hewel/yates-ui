#!/usr/bin/env bash
set -euo pipefail

state_dir=${YATES_LIVE_STATE_DIR:-/tmp/yates-ui-live-acceptance}
command_fifo="$state_dir/vmouse.commands"

if [[ $# -lt 2 ]]; then
  printf 'usage: %s heartbeat SEQ | move SEQ DX DY | stop SEQ\n' "$0" >&2
  exit 64
fi

command=$1
seq=$2
case "$command" in
  heartbeat | stop)
    [[ $# -eq 2 ]] || exit 64
    payload=$(printf '{"type":"%s","seq":%s}' "$command" "$seq")
    ;;
  move)
    [[ $# -eq 4 ]] || exit 64
    payload=$(printf '{"type":"move","seq":%s,"dx":%s,"dy":%s}' "$seq" "$3" "$4")
    ;;
  *)
    printf 'unknown command: %s\n' "$command" >&2
    exit 64
    ;;
esac

[[ -p "$command_fifo" ]] || {
  printf '{"type":"error","ok":false,"code":"daemon_not_running"}\n' >&2
  exit 7
}
printf '%s\n' "$payload" >"$command_fifo"
