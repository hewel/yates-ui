import Gio from "gi://Gio"
import GLib from "gi://GLib"

import { Accessor, createState } from "gnim"

import { diagnosticLog } from "../debug/log"
import { NiriState, applyNiriEventLine, focusWorkspaceRequest, initialNiriState } from "./state"

export interface NiriStateSource {
  readonly state: Accessor<NiriState>
  readonly socketPath: string | null
  readonly connected: () => boolean
  focusWorkspace(workspaceId: number): void
  stop(): void
}

export function createNiriStateSource(): NiriStateSource {
  const [state, setState] = createState(initialNiriState)
  const socketPath = GLib.getenv("NIRI_SOCKET")
  const cancellable = new Gio.Cancellable()
  let connection: Gio.SocketConnection | null = null
  let reconnectSource = 0
  let stopped = false
  let isConnected = false

  const scheduleReconnect = () => {
    if (stopped || reconnectSource !== 0) return
    reconnectSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
      reconnectSource = 0
      connectEventStream()
      return GLib.SOURCE_REMOVE
    })
  }

  const readNext = (input: Gio.DataInputStream) => {
    if (stopped) return
    input.read_line_async(GLib.PRIORITY_DEFAULT, cancellable, (stream, result) => {
      if (!stream || stopped) return
      try {
        const [line] = stream.read_line_finish_utf8(result)
        if (line === null) {
          isConnected = false
          diagnosticLog("niri.disconnected")
          scheduleReconnect()
          return
        }

        const reduced = applyNiriEventLine(state.peek(), line)
        if (reduced.outcome === "applied") setState(reduced.state)
        if (reduced.outcome === "invalid") {
          diagnosticLog("niri.event.invalid", { error: "schema-decode-failed" })
        }
        readNext(stream)
      } catch (cause) {
        if (!stopped) {
          isConnected = false
          diagnosticLog("niri.read.failed", { error: String(cause) })
          scheduleReconnect()
        }
      }
    })
  }

  const connectEventStream = () => {
    if (!socketPath || stopped) return
    const client = new Gio.SocketClient()
    const address = new Gio.UnixSocketAddress({ path: socketPath })
    client.connect_async(address, cancellable, (source, result) => {
      try {
        const nextConnection = source?.connect_finish(result)
        if (!nextConnection || stopped) return
        connection?.close(null)
        connection = nextConnection
        const output = new Gio.DataOutputStream({
          base_stream: nextConnection.get_output_stream(),
        })
        const input = new Gio.DataInputStream({
          base_stream: nextConnection.get_input_stream(),
        })
        output.put_string('"EventStream"\n', cancellable)
        isConnected = true
        diagnosticLog("niri.connected", { socket: socketPath })
        readNext(input)
      } catch (cause) {
        if (!stopped) {
          isConnected = false
          diagnosticLog("niri.connect.failed", { error: String(cause) })
          scheduleReconnect()
        }
      }
    })
  }

  const sendRequest = (request: string) => {
    if (!socketPath || stopped) return
    const client = new Gio.SocketClient()
    const address = new Gio.UnixSocketAddress({ path: socketPath })
    client.connect_async(address, cancellable, (source, result) => {
      try {
        const actionConnection = source?.connect_finish(result)
        if (!actionConnection) return
        const output = new Gio.DataOutputStream({
          base_stream: actionConnection.get_output_stream(),
        })
        output.put_string(`${request}\n`, cancellable)
        actionConnection.close(null)
      } catch (cause) {
        diagnosticLog("niri.request.failed", { error: String(cause) })
      }
    })
  }

  if (socketPath) connectEventStream()
  else diagnosticLog("niri.socket.missing")

  return {
    state,
    socketPath,
    connected: () => isConnected,
    focusWorkspace: (workspaceId) => {
      sendRequest(focusWorkspaceRequest(workspaceId))
    },
    stop: () => {
      if (stopped) return
      stopped = true
      isConnected = false
      cancellable.cancel()
      if (reconnectSource !== 0) GLib.source_remove(reconnectSource)
      connection?.close(null)
      connection = null
    },
  }
}
