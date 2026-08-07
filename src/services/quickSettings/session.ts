import AccountsService from "gi://AccountsService"
import Gio from "gi://Gio"
import GLib from "gi://GLib"

export interface SessionCapabilitySnapshot {
  readonly logOut: boolean
  readonly switchUser: boolean
}

export interface SessionController {
  readonly snapshot: () => SessionCapabilitySnapshot
  readonly logOut: (bus: Gio.DBusConnection, cancellable: Gio.Cancellable) => Promise<void>
  readonly switchUser: (bus: Gio.DBusConnection, cancellable: Gio.Cancellable) => Promise<void>
  readonly stop: () => void
}

function callLogindManager(
  bus: Gio.DBusConnection,
  method: string,
  parameters: GLib.Variant | null,
  cancellable: Gio.Cancellable,
): Promise<GLib.Variant> {
  return bus.call(
    "org.freedesktop.login1",
    "/org/freedesktop/login1",
    "org.freedesktop.login1.Manager",
    method,
    parameters,
    null,
    Gio.DBusCallFlags.NONE,
    -1,
    cancellable,
  )
}

export function createSessionController(onChanged: () => void): SessionController {
  const manager = AccountsService.UserManager.get_default()
  const sessionId = GLib.getenv("XDG_SESSION_ID")
  const signalIds = [
    manager.connect("notify::is-loaded", onChanged),
    manager.connect("notify::has-multiple-users", onChanged),
    manager.connect("user-added", onChanged),
    manager.connect("user-removed", onChanged),
  ]
  let stopped = false

  const snapshot = (): SessionCapabilitySnapshot => {
    try {
      return {
        logOut: sessionId !== null,
        switchUser:
          manager.is_loaded &&
          manager.has_multiple_users &&
          !manager.no_service() &&
          manager.can_switch(),
      }
    } catch {
      return { logOut: sessionId !== null, switchUser: false }
    }
  }

  return {
    snapshot,
    logOut: async (bus, cancellable) => {
      if (sessionId === null) throw new Error("current session is unavailable")
      await callLogindManager(
        bus,
        "TerminateSession",
        new GLib.Variant("(s)", [sessionId]),
        cancellable,
      )
    },
    switchUser: async (bus, cancellable) => {
      if (!snapshot().switchUser) throw new Error("user switching is unavailable")
      if (sessionId !== null) {
        await callLogindManager(
          bus,
          "LockSession",
          new GLib.Variant("(s)", [sessionId]),
          cancellable,
        )
      }
      if (!manager.goto_login_session()) throw new Error("login session could not be activated")
    },
    stop: () => {
      if (stopped) return
      stopped = true
      for (const signalId of signalIds) {
        try {
          manager.disconnect(signalId)
        } catch {
          // AccountsService may disappear while the application is stopping.
        }
      }
    },
  }
}
