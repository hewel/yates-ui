import { expect, test } from "bun:test"

import { WindowRegistry } from "../src/windowRegistry"

test("repeated activation keeps one bar per connector and removes missing outputs", () => {
  const created: string[] = []
  const destroyed: string[] = []
  const registry = new WindowRegistry((connector) => {
    created.push(connector)
    return { destroy: () => destroyed.push(connector) }
  })

  registry.reconcile(["DP-1", "HDMI-A-1"])
  registry.reconcile(["DP-1", "HDMI-A-1"])
  expect(created).toEqual(["DP-1", "HDMI-A-1"])
  expect(registry.connectors()).toEqual(["DP-1", "HDMI-A-1"])

  registry.reconcile(["DP-1"])
  expect(destroyed).toEqual(["HDMI-A-1"])
  registry.destroy()
  expect(destroyed).toEqual(["HDMI-A-1", "DP-1"])
})
