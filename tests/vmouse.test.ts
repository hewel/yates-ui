import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const daemon = join(import.meta.dir, "../scripts/live-acceptance/vmouse.py")
const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

async function runProtocol(commands: unknown[]) {
  const directory = mkdtempSync(join(tmpdir(), "yates-vmouse-"))
  temporaryDirectories.push(directory)
  const eventPath = join(directory, "relative-events.jsonl")
  const input = commands.map((command) => JSON.stringify(command)).join("\n") + "\n"
  const process = Bun.spawn(["python3", daemon, "--record-events", eventPath], {
    stdin: new Blob([input]),
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  return {
    exitCode,
    messages: stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line)),
    stderr,
    events: readFileSync(eventPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line)),
  }
}

describe("persistent virtual mouse protocol", () => {
  test("keeps stable identity and acknowledges heartbeat, relative move, and stop", async () => {
    const result = await runProtocol([
      { type: "heartbeat", seq: 1 },
      { type: "move", seq: 2, dx: 17, dy: -9 },
      { type: "stop", seq: 3 },
    ])

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.messages[0]).toEqual({
      type: "ready",
      seq: 0,
      ok: true,
      device: {
        name: "yates-ui live acceptance pointer",
        phys: "yates-ui/live-acceptance/vmouse0",
        bus: 3,
        vendor: 7531,
        product: 4176,
        version: 1,
      },
      axes: ["REL_X", "REL_Y"],
    })
    expect(result.messages.slice(1)).toEqual([
      { type: "ack", command: "heartbeat", seq: 1, ok: true },
      { type: "ack", command: "move", seq: 2, ok: true },
      { type: "ack", command: "stop", seq: 3, ok: true },
      { type: "stopped", seq: 3, ok: true },
    ])
    expect(result.events).toEqual([
      {
        events: [
          { type: "EV_REL", code: "REL_X", value: 17 },
          { type: "EV_REL", code: "REL_Y", value: -9 },
          { type: "EV_SYN", code: "SYN_REPORT", value: 0 },
        ],
      },
    ])
  })

  test("rejects non-monotonic sequence numbers with structured errors", async () => {
    const result = await runProtocol([
      { type: "heartbeat", seq: 4 },
      { type: "move", seq: 4, dx: 1, dy: 1 },
      { type: "stop", seq: 5 },
    ])

    expect(result.exitCode).toBe(0)
    expect(result.messages[2]).toEqual({
      type: "error",
      seq: 4,
      ok: false,
      code: "non_monotonic_seq",
      message: "seq must be greater than 4",
    })
    expect(result.events).toEqual([])
  })
})
