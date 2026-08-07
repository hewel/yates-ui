#!/usr/bin/env python3
"""Persistent relative-pointer daemon for yates-ui live acceptance.

The wire protocol is newline-delimited JSON on stdin/stdout. Every command must
carry an integer ``seq`` greater than the preceding accepted command. Replies
echo that sequence number, making the event log suitable for acceptance proof.
"""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import struct
import sys
from dataclasses import dataclass
from typing import BinaryIO, TextIO


DEVICE_NAME = "yates-ui live acceptance pointer"
DEVICE_PHYS = "yates-ui/live-acceptance/vmouse0"
DEVICE_ID = {"bus": 0x03, "vendor": 0x1D6B, "product": 0x1050, "version": 1}

EV_SYN = 0x00
EV_REL = 0x02
SYN_REPORT = 0
REL_X = 0
REL_Y = 1


def _ioc(direction: int, kind: int, number: int, size: int) -> int:
    return direction << 30 | size << 16 | kind << 8 | number


def _io(kind: int, number: int) -> int:
    return _ioc(0, kind, number, 0)


def _iow(kind: int, number: int, size: int) -> int:
    return _ioc(1, kind, number, size)


UINPUT = ord("U")
UI_SET_EVBIT = _iow(UINPUT, 100, struct.calcsize("i"))
UI_SET_RELBIT = _iow(UINPUT, 102, struct.calcsize("i"))
UI_SET_PHYS = _iow(UINPUT, 108, struct.calcsize("P"))
UI_DEV_CREATE = _io(UINPUT, 1)
UI_DEV_DESTROY = _io(UINPUT, 2)
UINPUT_SETUP_FORMAT = "HHHH80sI"
UI_DEV_SETUP = _iow(UINPUT, 3, struct.calcsize(UINPUT_SETUP_FORMAT))
INPUT_EVENT_FORMAT = "@llHHi"


class ProtocolError(Exception):
    def __init__(self, code: str, message: str, seq: int | None = None):
        super().__init__(message)
        self.code = code
        self.seq = seq


class PointerDevice:
    def move(self, dx: int, dy: int) -> None:
        raise NotImplementedError

    def close(self) -> None:
        raise NotImplementedError


class UinputPointer(PointerDevice):
    def __init__(self, path: str):
        self._file: BinaryIO | None = None
        try:
            device = open(path, "wb", buffering=0)
            self._file = device
            fcntl.ioctl(device, UI_SET_EVBIT, EV_REL)
            fcntl.ioctl(device, UI_SET_RELBIT, REL_X)
            fcntl.ioctl(device, UI_SET_RELBIT, REL_Y)
            fcntl.ioctl(device, UI_SET_PHYS, DEVICE_PHYS.encode() + b"\0")
            setup = struct.pack(
                UINPUT_SETUP_FORMAT,
                DEVICE_ID["bus"],
                DEVICE_ID["vendor"],
                DEVICE_ID["product"],
                DEVICE_ID["version"],
                DEVICE_NAME.encode(),
                0,
            )
            fcntl.ioctl(device, UI_DEV_SETUP, setup)
            fcntl.ioctl(device, UI_DEV_CREATE)
        except Exception:
            if self._file is not None:
                self._file.close()
            self._file = None
            raise

    def _emit(self, event_type: int, code: int, value: int) -> None:
        assert self._file is not None
        self._file.write(struct.pack(INPUT_EVENT_FORMAT, 0, 0, event_type, code, value))

    def move(self, dx: int, dy: int) -> None:
        self._emit(EV_REL, REL_X, dx)
        self._emit(EV_REL, REL_Y, dy)
        self._emit(EV_SYN, SYN_REPORT, 0)

    def close(self) -> None:
        if self._file is None:
            return
        try:
            fcntl.ioctl(self._file, UI_DEV_DESTROY)
        finally:
            self._file.close()
            self._file = None


class RecordingPointer(PointerDevice):
    """Explicit test backend; never selected by production wrappers."""

    def __init__(self, path: str):
        self._output = open(path, "w", encoding="utf-8")

    def move(self, dx: int, dy: int) -> None:
        json.dump(
            {
                "events": [
                    {"type": "EV_REL", "code": "REL_X", "value": dx},
                    {"type": "EV_REL", "code": "REL_Y", "value": dy},
                    {"type": "EV_SYN", "code": "SYN_REPORT", "value": 0},
                ]
            },
            self._output,
            separators=(",", ":"),
        )
        self._output.write("\n")
        self._output.flush()

    def close(self) -> None:
        self._output.close()


@dataclass
class Protocol:
    device: PointerDevice
    output: TextIO
    last_seq: int = 0

    def send(self, payload: dict[str, object]) -> None:
        json.dump(payload, self.output, separators=(",", ":"))
        self.output.write("\n")
        self.output.flush()

    def _seq(self, command: dict[str, object]) -> int:
        seq = command.get("seq")
        if isinstance(seq, bool) or not isinstance(seq, int):
            raise ProtocolError("invalid_seq", "seq must be an integer")
        if seq <= self.last_seq:
            raise ProtocolError(
                "non_monotonic_seq",
                f"seq must be greater than {self.last_seq}",
                seq,
            )
        return seq

    def handle(self, command: object) -> bool:
        if not isinstance(command, dict):
            raise ProtocolError("invalid_command", "command must be a JSON object")
        seq = self._seq(command)
        command_type = command.get("type")
        if command_type == "heartbeat":
            pass
        elif command_type == "move":
            dx = command.get("dx")
            dy = command.get("dy")
            if (
                isinstance(dx, bool)
                or not isinstance(dx, int)
                or isinstance(dy, bool)
                or not isinstance(dy, int)
            ):
                raise ProtocolError("invalid_move", "dx and dy must be integers", seq)
            if not (-32767 <= dx <= 32767 and -32767 <= dy <= 32767):
                raise ProtocolError("invalid_move", "dx and dy must be within +/-32767", seq)
            self.device.move(dx, dy)
        elif command_type != "stop":
            raise ProtocolError("unknown_command", "type must be heartbeat, move, or stop", seq)

        self.last_seq = seq
        self.send({"type": "ack", "command": command_type, "seq": seq, "ok": True})
        return command_type != "stop"


def error_payload(error: Exception, seq: int | None = None) -> dict[str, object]:
    if isinstance(error, ProtocolError):
        return {
            "type": "error",
            "seq": error.seq if error.seq is not None else seq,
            "ok": False,
            "code": error.code,
            "message": str(error),
        }
    return {
        "type": "error",
        "seq": seq,
        "ok": False,
        "code": "device_error",
        "message": str(error),
    }


def run(device: PointerDevice, source: TextIO, output: TextIO) -> int:
    protocol = Protocol(device, output)
    protocol.send(
        {
            "type": "ready",
            "seq": 0,
            "ok": True,
            "device": {"name": DEVICE_NAME, "phys": DEVICE_PHYS, **DEVICE_ID},
            "axes": ["REL_X", "REL_Y"],
        }
    )
    exit_code = 2
    stopped = False
    try:
        for line in source:
            if not line.strip():
                continue
            seq: int | None = None
            try:
                command = json.loads(line)
                if isinstance(command, dict) and isinstance(command.get("seq"), int):
                    seq = command["seq"]
                if not protocol.handle(command):
                    stopped = True
                    exit_code = 0
                    break
            except (json.JSONDecodeError, ProtocolError, OSError) as error:
                if isinstance(error, json.JSONDecodeError):
                    error = ProtocolError("invalid_json", "input is not valid JSON")
                protocol.send(error_payload(error, seq))
        if not stopped:
            protocol.send(error_payload(ProtocolError("stdin_closed", "stdin closed before stop")))
    finally:
        try:
            device.close()
            if stopped:
                protocol.send(
                    {
                        "type": "stopped",
                        "seq": protocol.last_seq,
                        "ok": True,
                    }
                )
        except OSError as error:
            protocol.send(error_payload(error))
            exit_code = 3
    return exit_code


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", default="/dev/uinput")
    parser.add_argument("--record-events", metavar="PATH", help=argparse.SUPPRESS)
    args = parser.parse_args()
    try:
        device: PointerDevice
        if args.record_events:
            device = RecordingPointer(args.record_events)
        else:
            device = UinputPointer(args.device)
    except (OSError, ValueError) as error:
        print(json.dumps(error_payload(error)), flush=True)
        return 3
    return run(device, sys.stdin, sys.stdout)


if __name__ == "__main__":
    raise SystemExit(main())
