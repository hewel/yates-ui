#!/usr/bin/env bash
set -u

state_dir=${1:-/tmp/yates-ui-live-acceptance}
artifact_dir=${2:-"$state_dir/artifacts"}
mkdir -p -- "$artifact_dir"

cp -- "$state_dir/preflight.json" "$artifact_dir/" 2>/dev/null || true
cp -- "$state_dir/vmouse.events.jsonl" "$artifact_dir/" 2>/dev/null || true
cp -- "$state_dir/vmouse.stderr.log" "$artifact_dir/" 2>/dev/null || true
{
  printf 'collected_at=%s\n' "$(date --iso-8601=seconds)"
  printf 'wayland_display=%s\n' "${WAYLAND_DISPLAY:-}"
  printf 'niri_socket=%s\n' "${NIRI_SOCKET:-}"
  uname -a
} >"$artifact_dir/environment.txt"
ps -ef >"$artifact_dir/processes.txt" 2>&1 || true
niri msg layers >"$artifact_dir/niri-layers.txt" 2>&1 || true
ls -l /dev/uinput >"$artifact_dir/uinput.txt" 2>&1 || true

printf '{"type":"artifacts","ok":true,"path":"%s","mutations":[]}\n' "$artifact_dir"
