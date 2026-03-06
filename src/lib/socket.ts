import Gio from "gi://Gio"
import GLib from "gi://GLib"

import { Data, Effect, Stream, Queue, Cause } from "effect"
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
export const jsonParse = <R = object>(str: string) =>
  Effect.try({
    try: () => JSON.parse(str) as R,
    catch: (error) => new JsonParseError({ line: str, cause: error }),
  })

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
export const putString = (output: Gio.DataOutputStream, str: string) =>
  Effect.sync(() => output.put_string(str, null))

export function formatRequest<R extends Niri.Request>(request: R): string {
  const obj = match<Niri.Request>(request)
    .with({ type: P.union("Action", "Output") }, ({ type, ...data }) => ({ [type]: data }))
    .otherwise(({ type }) => type)
  return JSON.stringify(obj) + "\n"
}
const extractPayload = <R extends Niri.Request>(response: Niri.ResponseWire) =>
  Effect.fromNullishOr<Niri.ResponseFor<R>>(Object.entries(response)[0]?.[1])

const cancellable = Effect.acquireRelease(
  Effect.sync(() => new Gio.Cancellable()),
  (cancellable) =>
    Effect.sync(() => {
      cancellable.cancel()
    }),
)
export const eventStream = Stream.callback<string, NiriStreamError | Cause.NoSuchElementError>(
  (queue) =>
    Effect.zip(
      connectGioClient.pipe(
        Effect.tap(({ output }) =>
          putString(
            output,
            formatRequest({
              type: "EventStream",
            }),
          ),
        ),
      ),
      cancellable,
    ).pipe(
      Effect.flatMap(([{ input }, cancellable]) =>
        Effect.sync(() => {
          const loop = () =>
            input.read_line_async(GLib.PRIORITY_DEFAULT, cancellable, (stream, res) => {
              const line = stream?.read_line_finish_utf8(res)?.[0]
              if (!line) {
                Queue.endUnsafe(queue) // Signal end of stream
                return
              }
              Queue.offerUnsafe(queue, line)
              loop()
            })
          try {
            loop()
          } catch (error) {
            if (cancellable.is_cancelled()) {
              Queue.endUnsafe(queue)
              return
            }
            Queue.failCauseUnsafe(
              queue,
              Cause.fail(
                new ConnectionError({ message: "Failed to close connection", cause: error }),
              ),
            )
          }
        }),
      ),
    ),
  {
    bufferSize: 100, // Buffer up to 100 lines
    strategy: "sliding",
  },
).pipe(
  Stream.mapEffect((line) => jsonParse<any>(line)),
  Stream.mapEffect((parsed) =>
    Effect.fromNullishOr(Object.keys(parsed)[0] as Niri.EventType).pipe(
      Effect.map((eventType) => ({ type: eventType, ...parsed[eventType] }) as Niri.Event),
    ),
  ),
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
        Effect.flatMap(jsonParse<Niri.Reply>),
        Effect.flatMap((parsed) =>
          "Err" in parsed ? Effect.fail(new Error(parsed.Err)) : Effect.succeed(parsed.Ok),
        ),
        Effect.flatMap(extractPayload<R>),
      )
  return Effect.acquireUseRelease(connectGioClient, use, ({ close }) => close)
}
