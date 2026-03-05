import Gio from "gi://Gio"
import GLib from "gi://GLib"

import { Data, Effect, Stream, Console, Queue, Cause } from "effect"
import { match, P } from "ts-pattern"

import * as Niri from "./niri.types"

class ConnectionError extends Data.TaggedError("ConnectionError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

class JsonParseError extends Data.TaggedError("JsonParseError")<{
  readonly line: string
  readonly cause?: unknown
}> {}

type NiriStreamError = ConnectionError | JsonParseError

const socketAddress = Effect.fromNullishOr(GLib.getenv("NIRI_SOCKET")).pipe(
  Effect.map((socketPath) => Gio.UnixSocketAddress.new(socketPath)),
)
export const socketClient = Effect.sync(() => new Gio.SocketClient())

export const connectGioClient = Effect.Do.pipe(
  Effect.bind("client", () => socketClient),
  Effect.bind("address", () => socketAddress),
).pipe(
  Effect.flatMap(({ client, address }) => {
    return Effect.callback<Gio.SocketConnection, Cause.NoSuchElementError>((resume) => {
      client.connect_async(address, null, (c, res) => {
        resume(Effect.fromNullishOr(c?.connect_finish(res)))
      })
    }).pipe(
      Effect.map((connection) => ({
        connection,
        output: new Gio.DataOutputStream({ base_stream: connection.get_output_stream() }),
        input: new Gio.DataInputStream({ base_stream: connection.get_input_stream() }),
        close: Effect.try({
          try: () => connection.close(null),
          catch: (error) =>
            new ConnectionError({ message: "Failed to close connection", cause: error }),
        }).pipe(Effect.ignore, Effect.uninterruptible),
      })),
    )
  }),
)
const putString = (output: Gio.DataOutputStream, str: string) =>
  Effect.sync(() => output.put_string(str, null))

function formatRequest<R extends Niri.Request>(request: R): string {
  const obj = match<Niri.Request>(request)
    .with({ type: P.union("Action", "Output") }, ({ type, ...data }) => ({ [type]: data }))
    .otherwise(({ type }) => type)
  return JSON.stringify(obj) + "\n"
}
const extractPayload = <R extends Niri.Request>(response: Niri.ResponseWire) =>
  Effect.fromNullishOr<Niri.ResponseFor<R>>(Object.entries(response)[0]?.[1])

const readAndParseEvent = (
  input: Gio.DataInputStream,
): Effect.Effect<Niri.Event, NiriStreamError | Cause.NoSuchElementError> => {
  return Effect.callback((resume) => {
    let cancelled = false
    input.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, res) => {
      if (cancelled) {
        resume(Effect.interrupt)
        return
      }
      if (!stream) {
        resume(Effect.fail(new Cause.NoSuchElementError("No stream"))) // Signal end of stream
        return
      }
      try {
        const [line] = stream.read_line_finish_utf8(res)
        if (!line) {
          resume(Effect.fail(new Cause.NoSuchElementError("No line"))) // Signal end of stream
          return
        }
        const eventObj = JSON.parse(line)
        const type = Object.keys(eventObj)[0] as Niri.EventType
        resume(Effect.succeed({ type, ...eventObj[type] } as Niri.Event))
      } catch (error) {
        resume(Effect.fail(new JsonParseError({ line: "failed to parse", cause: error })))
      }
    })
    return Effect.sync(() => {
      cancelled = true
    })
  })
}

export const createEventStream = Effect.acquireUseRelease(
  connectGioClient.pipe(Effect.tap(({ output }) => putString(output, `"EventStream"`))),
  ({ input }) =>
    Effect.succeed(
      Stream.callback<Niri.Event, NiriStreamError>((queue) =>
        readAndParseEvent(input)
          .pipe(
            Effect.flatMap((event) => Queue.offer(queue, event)),
            Effect.catch(() => Effect.as(Queue.end(queue), undefined as any)),
          )
          .pipe(Effect.forever())
          .pipe(
            Effect.catchCause((cause) => {
              Queue.failCauseUnsafe(queue, cause)
              return Effect.void
            }),
          ),
      ),
    ),
  ({ close }) => {
    console.log("close")

    return close
  },
)

export const sendMessage = <R extends Niri.Request>(request: R) => {
  const use = ({ input, output }: Effect.Success<typeof connectGioClient>) =>
    putString(output, formatRequest(request))
      .pipe(
        Effect.flatMap(() =>
          Effect.callback<string, Error>((resume) =>
            input.read_line_async(GLib.PRIORITY_DEFAULT, null, (inStream, readRes) => {
              resume(Effect.fromNullishOr(inStream?.read_line_finish_utf8(readRes)?.[0]))
            }),
          ),
        ),
      )
      .pipe(
        Effect.flatMap((line) =>
          Effect.try({
            try: () => JSON.parse(line) as Niri.Reply,
            catch: (error) =>
              new JsonParseError({ line: "failed to parse response", cause: error }),
          }),
        ),
        Effect.flatMap((parsed) =>
          "Err" in parsed ? Effect.fail(new Error(parsed.Err)) : Effect.succeed(parsed.Ok),
        ),
        Effect.flatMap(extractPayload<R>),
      )
  return Effect.acquireUseRelease(connectGioClient, use, ({ close }) => close)
}

export const eventStream = Stream.scoped(Stream.fromEffect(createEventStream))
