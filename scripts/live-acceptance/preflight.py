#!/usr/bin/env python3
"""Read-only environment checks for pointer-driven live acceptance."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import stat
import subprocess
import sys
from pathlib import Path


def processes() -> list[dict[str, object]]:
    found: list[dict[str, object]] = []
    for entry in Path("/proc").iterdir():
        if not entry.name.isdigit():
            continue
        try:
            command = (entry / "cmdline").read_bytes().replace(b"\0", b" ").decode().strip()
        except (OSError, UnicodeDecodeError):
            continue
        if command:
            found.append({"pid": int(entry.name), "command": command})
    return found


def check_uinput(path: str) -> dict[str, object]:
    evidence: dict[str, object] = {"path": path, "exists": os.path.exists(path)}
    try:
        info = os.stat(path)
        evidence["character_device"] = stat.S_ISCHR(info.st_mode)
        evidence["mode"] = oct(stat.S_IMODE(info.st_mode))
        evidence["uid"] = info.st_uid
        evidence["gid"] = info.st_gid
        evidence["writable"] = os.access(path, os.W_OK)
        descriptor = os.open(path, os.O_WRONLY | os.O_NONBLOCK)
        os.close(descriptor)
        evidence["open_write"] = True
    except OSError as error:
        evidence["open_write"] = False
        evidence["error"] = f"{error.__class__.__name__}: {error}"
    return evidence


def niri_layers() -> dict[str, object]:
    niri = shutil.which("niri")
    if niri is None:
        return {"available": False, "error": "niri executable not found"}
    try:
        result = subprocess.run(
            [niri, "msg", "--json", "layers"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"available": True, "error": f"{error.__class__.__name__}: {error}"}
    output = (result.stdout + result.stderr).strip()
    suspected_layers: list[dict[str, object]] = []
    try:
        decoded = json.loads(result.stdout)
        pending: list[object] = [decoded]
        while pending:
            item = pending.pop()
            if isinstance(item, list):
                pending.extend(item)
            elif isinstance(item, dict):
                namespace = item.get("namespace")
                exclusive_zone = item.get("exclusive_zone")
                if (
                    isinstance(namespace, str)
                    and (
                        namespace == "yates-bar"
                        or
                        re.search(r"(?:bar|panel|dock)", namespace, re.IGNORECASE)
                        or isinstance(exclusive_zone, int)
                        and exclusive_zone != 0
                    )
                ):
                    suspected_layers.append(item)
                pending.extend(item.values())
    except json.JSONDecodeError:
        pass
    exclusive_lines = [
        line.strip()
        for line in output.splitlines()
        if re.search(r"exclusive(?:[-_ ]zone)?\D+(-?[1-9]\d*)", line, re.IGNORECASE)
    ]
    return {
        "available": True,
        "exit_code": result.returncode,
        "exclusive_zone_lines": exclusive_lines,
        "suspected_exclusive_zone_layers": suspected_layers,
        "output": output,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", default="/dev/uinput")
    args = parser.parse_args()

    tool_paths = {name: shutil.which(name) for name in ("bash", "flock", "python3", "niri")}
    relevant_processes = [
        item
        for item in processes()
        if re.search(r"(?:^|[/ ])(?:dms|dank[-_ ]?material[-_ ]?shell)(?:\s|$)", str(item["command"]), re.I)
    ]
    uinput = check_uinput(args.device)
    layers = niri_layers()
    failures: list[dict[str, str]] = []
    missing = [name for name, path in tool_paths.items() if path is None]
    if missing:
        failures.append({"code": "missing_tools", "message": ", ".join(missing)})
    if not uinput.get("open_write") or not uinput.get("character_device"):
        failures.append(
            {"code": "uinput_unavailable", "message": f"cannot open {args.device} as a writable character device"}
        )
    if relevant_processes:
        failures.append(
            {"code": "dms_interference", "message": "DMS is active and may own a conflicting layer-shell exclusive zone"}
        )
    existing_yates = [
        layer
        for layer in layers.get("suspected_exclusive_zone_layers", [])
        if isinstance(layer, dict) and layer.get("namespace") == "yates-bar"
    ]
    if existing_yates:
        failures.append(
            {
                "code": "existing_yates_bar",
                "message": "an existing yates-bar layer makes live layer counts ambiguous",
            }
        )
    exclusive_lines = layers.get("exclusive_zone_lines")
    suspected_layers = layers.get("suspected_exclusive_zone_layers")
    if (isinstance(exclusive_lines, list) and exclusive_lines) or (
        isinstance(suspected_layers, list) and suspected_layers
    ):
        failures.append(
            {
                "code": "exclusive_zone_interference",
                "message": "Niri reports an existing exclusive zone or a competing bar/panel/dock layer",
            }
        )
    if layers.get("exit_code") not in (None, 0):
        failures.append({"code": "niri_inspection_failed", "message": "niri msg layers failed"})

    payload = {
        "type": "preflight",
        "ok": not failures,
        "failures": failures,
        "evidence": {
            "tools": tool_paths,
            "uinput": uinput,
            "dms_processes": relevant_processes,
            "niri_layers": layers,
        },
        "mutations": [],
    }
    print(json.dumps(payload, separators=(",", ":")))
    return 0 if not failures else 4


if __name__ == "__main__":
    raise SystemExit(main())
