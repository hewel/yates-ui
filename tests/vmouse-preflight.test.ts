import { describe, expect, test } from "bun:test"
import { join } from "node:path"

const preflight = join(import.meta.dir, "../scripts/live-acceptance/preflight.py")

describe("virtual mouse preflight", () => {
  test("fails with JSON evidence and no mutations for an unusable device", async () => {
    const process = Bun.spawn(["python3", preflight, "--device", "/definitely/missing/uinput"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ])
    const result = JSON.parse(stdout)

    expect(exitCode).toBe(4)
    expect(stderr).toBe("")
    expect(result.type).toBe("preflight")
    expect(result.ok).toBe(false)
    expect(result.failures).toContainEqual({
      code: "uinput_unavailable",
      message: "cannot open /definitely/missing/uinput as a writable character device",
    })
    expect(result.evidence.uinput.exists).toBe(false)
    expect(result.mutations).toEqual([])
  })
})
