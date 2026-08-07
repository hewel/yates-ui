import Gio from "gi://Gio"
import GLib from "gi://GLib"

import { diagnosticLog, diagnosticRunId } from "./log"

const interfaceXml = `
<node>
  <interface name="me.pigmint.YatesUi.Debug1">
    <method name="Ping"><arg direction="out" type="s" name="result"/></method>
    <method name="GetSnapshot"><arg direction="out" type="s" name="snapshot"/></method>
    <method name="WorkspaceEnter">
      <arg direction="in" type="s" name="output"/>
      <arg direction="in" type="u" name="workspaceId"/>
      <arg direction="out" type="s" name="result"/>
    </method>
    <method name="WorkspaceLeave"><arg direction="out" type="s" name="result"/></method>
    <method name="PopupEnter"><arg direction="out" type="s" name="result"/></method>
    <method name="PopupLeave"><arg direction="out" type="s" name="result"/></method>
    <method name="OpenQuickSettings">
      <arg direction="in" type="s" name="output"/>
      <arg direction="out" type="s" name="result"/>
    </method>
    <method name="SetBarOrientation">
      <arg direction="in" type="s" name="orientation"/>
      <arg direction="out" type="s" name="result"/>
    </method>
    <method name="Reset"><arg direction="out" type="s" name="result"/></method>
  </interface>
</node>`

export interface DebugControlHandlers {
  snapshot(): string
  workspaceEnter(output: string, workspaceId: number): string
  workspaceLeave(): string
  popupEnter(): string
  popupLeave(): string
  openQuickSettings(output: string): string
  setBarOrientation(orientation: string): string
  reset(): string
}

export interface DebugControl {
  readonly busName: string
  stop(): void
}

export function startDebugControl(handlers: DebugControlHandlers): DebugControl | null {
  if (GLib.getenv("YATES_DEBUG") !== "1") return null

  const suffix = diagnosticRunId().replaceAll(/[^A-Za-z0-9_]/g, "_")
  const busName = `me.pigmint.YatesUi.Debug.r${suffix}`
  const objectPath = "/me/pigmint/YatesUi/Debug"
  const exported = Gio.DBusExportedObject.wrapJSObject(interfaceXml, {
    Ping: () => JSON.stringify({ ok: true, runId: diagnosticRunId() }),
    GetSnapshot: () => handlers.snapshot(),
    WorkspaceEnter: (output: string, workspaceId: number) =>
      handlers.workspaceEnter(output, workspaceId),
    WorkspaceLeave: () => handlers.workspaceLeave(),
    PopupEnter: () => handlers.popupEnter(),
    PopupLeave: () => handlers.popupLeave(),
    OpenQuickSettings: (output: string) => handlers.openQuickSettings(output),
    SetBarOrientation: (orientation: string) => handlers.setBarOrientation(orientation),
    Reset: () => handlers.reset(),
  })
  const ownerId = Gio.bus_own_name(
    Gio.BusType.SESSION,
    busName,
    Gio.BusNameOwnerFlags.DO_NOT_QUEUE,
    (connection) => exported.export(connection, objectPath),
    () => diagnosticLog("debug.ready", { busName }),
    () => diagnosticLog("debug.name.lost", { busName }),
  )

  return {
    busName,
    stop: () => {
      exported.unexport()
      Gio.bus_unown_name(ownerId)
    },
  }
}
