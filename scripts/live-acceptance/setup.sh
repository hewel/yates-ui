#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
state_dir=${1:-/tmp/yates-ui-live-acceptance}

mkdir -p -- "$state_dir"
python3 "$script_dir/preflight.py" >"$state_dir/preflight.json"

exec 9>"$state_dir/setup.lock"
if ! flock --nonblock 9; then
  printf '{"type":"error","ok":false,"code":"setup_in_use","state_dir":"%s"}\n' "$state_dir" >&2
  exit 5
fi

owns_daemon=0
cleanup() {
  if [[ "$owns_daemon" -eq 1 ]] && kill -0 "$daemon_pid" 2>/dev/null; then
    kill -TERM "$daemon_pid" 2>/dev/null || true
    wait "$daemon_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ -f "$state_dir/vmouse.pid" ]]; then
  previous_pid=$(<"$state_dir/vmouse.pid")
  if [[ "$previous_pid" =~ ^[0-9]+$ ]] && kill -0 "$previous_pid" 2>/dev/null; then
    printf '{"type":"error","ok":false,"code":"state_in_use","pid":%s,"state_dir":"%s"}\n' "$previous_pid" "$state_dir" >&2
    exit 5
  fi
fi

command_fifo="$state_dir/vmouse.commands"
if [[ -e "$command_fifo" && ! -p "$command_fifo" ]]; then
  printf '{"type":"error","code":"invalid_state","message":"%s is not a FIFO"}\n' "$command_fifo" >&2
  exit 5
fi
[[ -p "$command_fifo" ]] || mkfifo -- "$command_fifo"

# Opening both sides in the daemon process keeps stdin alive between commands.
# shellcheck disable=SC2094
python3 "$script_dir/vmouse.py" <>"$command_fifo" >"$state_dir/vmouse.events.jsonl" 2>"$state_dir/vmouse.stderr.log" &
daemon_pid=$!
owns_daemon=1
printf '%s\n' "$daemon_pid" >"$state_dir/vmouse.pid"

for _attempt in {1..50}; do
  if [[ -s "$state_dir/vmouse.events.jsonl" ]] && grep -q '"type":"ready"' "$state_dir/vmouse.events.jsonl"; then
    owns_daemon=0
    printf '{"type":"started","ok":true,"pid":%s,"state_dir":"%s"}\n' "$daemon_pid" "$state_dir"
    exit 0
  fi
  if ! kill -0 "$daemon_pid" 2>/dev/null; then
    break
  fi
  sleep 0.1
done

printf '{"type":"error","ok":false,"code":"daemon_start_failed","state_dir":"%s"}\n' "$state_dir" >&2
exit 6
