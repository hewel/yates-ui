import type Gio from "gi://Gio"
import NM from "gi://NM"

export type SavedConnectionKind = "wired" | "vpn" | "mobile" | "bluetooth-tether"

export interface SavedConnectionSnapshot {
  readonly id: string
  readonly name: string
  readonly active: boolean
  readonly lastUsed: number
}

export interface NetworkManagerSnapshot {
  readonly running: boolean
  readonly wifiAvailable: boolean
  readonly wifiEnabled: boolean
  readonly wwanAvailable: boolean
  readonly wwanEnabled: boolean
  readonly bluetoothTetherAvailable: boolean
  readonly wired: ReadonlyArray<SavedConnectionSnapshot>
  readonly vpn: ReadonlyArray<SavedConnectionSnapshot>
  readonly mobile: ReadonlyArray<SavedConnectionSnapshot>
  readonly bluetoothTether: ReadonlyArray<SavedConnectionSnapshot>
}

export const unavailableNetworkManagerSnapshot: NetworkManagerSnapshot = {
  running: false,
  wifiAvailable: false,
  wifiEnabled: false,
  wwanAvailable: false,
  wwanEnabled: false,
  bluetoothTetherAvailable: false,
  wired: [],
  vpn: [],
  mobile: [],
  bluetoothTether: [],
}

function savedConnectionKind(connectionType: string): SavedConnectionKind | null {
  switch (connectionType) {
    case NM.SETTING_WIRED_SETTING_NAME:
      return "wired"
    case NM.SETTING_VPN_SETTING_NAME:
    case NM.SETTING_WIREGUARD_SETTING_NAME:
      return "vpn"
    case NM.SETTING_GSM_SETTING_NAME:
    case NM.SETTING_CDMA_SETTING_NAME:
      return "mobile"
    case NM.SETTING_BLUETOOTH_SETTING_NAME:
      return "bluetooth-tether"
    default:
      return null
  }
}

function hasDevice(client: NM.Client, type: NM.DeviceType): boolean {
  return client.get_devices().some((device) => device.get_device_type() === type)
}

export function readNetworkManagerSnapshot(client: NM.Client): NetworkManagerSnapshot {
  const activeIds = new Set(client.get_active_connections().map((active) => active.get_uuid()))
  const groups: Record<SavedConnectionKind, Array<SavedConnectionSnapshot>> = {
    wired: [],
    vpn: [],
    mobile: [],
    "bluetooth-tether": [],
  }

  for (const connection of client.get_connections()) {
    const kind = savedConnectionKind(connection.get_connection_type())
    if (kind === null) continue
    const id = connection.get_uuid()
    groups[kind].push({
      id,
      name: connection.get_id(),
      active: activeIds.has(id),
      lastUsed: connection.get_setting_connection().get_timestamp(),
    })
  }

  for (const connections of Object.values(groups)) {
    connections.sort((left, right) => {
      if (left.active !== right.active) return left.active ? -1 : 1
      if (left.lastUsed !== right.lastUsed) return right.lastUsed - left.lastUsed
      return left.name.localeCompare(right.name)
    })
  }

  return {
    running: client.get_nm_running(),
    wifiAvailable: hasDevice(client, NM.DeviceType.WIFI),
    wifiEnabled: client.wireless_enabled,
    wwanAvailable: hasDevice(client, NM.DeviceType.MODEM),
    wwanEnabled: client.wwan_enabled,
    bluetoothTetherAvailable:
      hasDevice(client, NM.DeviceType.BT) && groups["bluetooth-tether"].length > 0,
    wired: groups.wired,
    vpn: groups.vpn,
    mobile: groups.mobile,
    bluetoothTether: groups["bluetooth-tether"],
  }
}

function findCompatibleDevice(
  client: NM.Client,
  connection: NM.RemoteConnection,
): NM.Device | null {
  return client.get_devices().find((device) => device.connection_valid(connection)) ?? null
}

export async function toggleSavedConnection(
  client: NM.Client,
  kind: SavedConnectionKind,
  id: string,
  cancellable: Gio.Cancellable,
): Promise<void> {
  const connection = client
    .get_connections()
    .find(
      (candidate) =>
        candidate.get_uuid() === id &&
        savedConnectionKind(candidate.get_connection_type()) === kind,
    )
  if (!connection) throw new Error(`saved ${kind} connection is unavailable`)

  const active = client
    .get_active_connections()
    .find((candidate) => candidate.get_uuid() === connection.get_uuid())
  if (active) {
    const deactivated = await client.deactivate_connection_async(active, cancellable)
    if (!deactivated) throw new Error(`could not deactivate ${connection.get_id()}`)
    return
  }

  const device = kind === "vpn" ? null : findCompatibleDevice(client, connection)
  if (kind !== "vpn" && device === null) {
    throw new Error(`no compatible device for ${connection.get_id()}`)
  }
  await client.activate_connection_async(connection, device, null, cancellable)
}

export interface NetworkManagerSignals {
  readonly stop: () => void
}

export function watchNetworkManager(
  client: NM.Client,
  onChanged: () => void,
): NetworkManagerSignals {
  const signalIds = [
    client.connect("active-connection-added", onChanged),
    client.connect("active-connection-removed", onChanged),
    client.connect("connection-added", onChanged),
    client.connect("connection-removed", onChanged),
    client.connect("device-added", onChanged),
    client.connect("device-removed", onChanged),
    client.connect("notify::nm-running", onChanged),
    client.connect("notify::wireless-enabled", onChanged),
    client.connect("notify::wireless-hardware-enabled", onChanged),
    client.connect("notify::wwan-enabled", onChanged),
    client.connect("notify::wwan-hardware-enabled", onChanged),
  ]

  let stopped = false
  return {
    stop: () => {
      if (stopped) return
      stopped = true
      for (const signalId of signalIds) {
        try {
          client.disconnect(signalId)
        } catch {
          // NetworkManager may disappear while the application is stopping.
        }
      }
    },
  }
}
