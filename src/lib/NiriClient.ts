import GObject, { register, signal, getter } from "gnim/gobject"
import { Effect, Console } from "effect"
import GLib from "gi://GLib"
import Gio from "gi://Gio"

export namespace NiriClient {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        event: (eventName: string, payloadStr: string) => void;
        workspacesChanged: (payloadStr: string) => void;
        workspaceActivated: (payloadStr: string) => void;
        windowsChanged: (payloadStr: string) => void;
        windowOpenedOrChanged: (payloadStr: string) => void;
        windowClosed: (payloadStr: string) => void;
        windowFocusChanged: (payloadStr: string) => void;
        keyboardLayoutsChanged: (payloadStr: string) => void;
        keyboardLayoutSwitched: (payloadStr: string) => void;
    }
}

@register()
class NiriClient extends GObject.Object {
    declare $signals: NiriClient.SignalSignatures

    @getter(String)
    get socketPath() {
        return GLib.getenv("NIRI_SOCKET") ?? "";
    }

    // Define signals using the @signal decorator.
    // The decorator automatically maps camelCase method names to kebab-case signals.
    // Calling these methods will automatically emit the signal.

    @signal(String, String)
    event(eventName: string, payloadStr: string) {
    }

    @signal(String)
    workspacesChanged(payloadStr: string) { }

    @signal(String)
    workspaceActivated(payloadStr: string) { }

    @signal(String)
    windowsChanged(payloadStr: string) { }

    @signal(String)
    windowOpenedOrChanged(payloadStr: string) { }

    @signal(String)
    windowClosed(payloadStr: string) { }

    @signal(String)
    windowFocusChanged(payloadStr: string) { }

    @signal(String)
    keyboardLayoutsChanged(payloadStr: string) { }

    @signal(String)
    keyboardLayoutSwitched(payloadStr: string) { }

    constructor() {
        super();

        if (!this.socketPath) {
            console.error("Error: NIRI_SOCKET environment variable is not set.");
            return;
        }

        // Initialize the asynchronous connection to Niri
        this._connectEventStream();
    }

    private _connectEventStream() {
        let client = new Gio.SocketClient();
        let address = new Gio.UnixSocketAddress({ path: this.socketPath });

        // Connect asynchronously to keep the main loop non-blocking
        client.connect_async(address, null, (_, res) => {
            try {
                let connection = client.connect_finish(res);
                let outStream = connection.get_output_stream();
                let inStream = new Gio.DataInputStream({
                    base_stream: connection.get_input_stream()
                });

                // Request the persistent event stream
                let requestPayload = '"EventStream"\n';

                outStream.write_all_async(requestPayload, GLib.PRIORITY_DEFAULT, null, (_, writeRes) => {
                    outStream.write_all_finish(writeRes);
                    this._readNextLine(inStream);
                });

            } catch (e) {
                console.error("Failed to connect to Niri IPC:", e);
            }
        });
    }

    private _readNextLine(inStream: Gio.DataInputStream) {
        inStream.read_line_async(GLib.PRIORITY_DEFAULT, null, (_, res) => {
            try {
                let [line, length] = inStream.read_line_finish_utf8(res);

                if (line !== null) {
                    this._handleEvent(line);
                    // Queue the next read iteration
                    this._readNextLine(inStream);
                } else {
                    console.error("Niri IPC event stream closed by the server.");
                }
            } catch (e) {
                console.error("Error reading from Niri event stream:", e);
            }
        });
    }

    private _handleEvent(line: string) {
        try {
            let eventObj = JSON.parse(line);
            let eventName = Object.keys(eventObj)[0];
            let payload = eventObj[eventName];
            let payloadStr = JSON.stringify(payload || {});

            // Calling the decorated methods automatically emits the underlying GObject signals
            this.event(eventName, payloadStr);

            switch (eventName) {
                case 'WorkspacesChanged':
                    this.workspacesChanged(payloadStr);
                    break;
                case 'WorkspaceActivated':
                    this.workspaceActivated(payloadStr);
                    break;
                case 'WindowsChanged':
                    this.windowsChanged(payloadStr);
                    break;
                case 'WindowOpenedOrChanged':
                    this.windowOpenedOrChanged(payloadStr);
                    break;
                case 'WindowClosed':
                    this.windowClosed(payloadStr);
                    break;
                case 'WindowFocusChanged':
                    this.windowFocusChanged(payloadStr);
                    break;
                case 'KeyboardLayoutsChanged':
                    this.keyboardLayoutsChanged(payloadStr);
                    break;
                case 'KeyboardLayoutSwitched':
                    this.keyboardLayoutSwitched(payloadStr);
                    break;
            }
        } catch (e) {
            console.error("Failed to parse or emit Niri event:", e);
        }
    }

    focusWorkspace(reference: string | number) {
        try {
            const command = ["niri", "msg", "action", "focus-workspace", `${reference}`];
            const process = Gio.Subprocess.new(command, Gio.SubprocessFlags.NONE);

            process.wait_check_async(null, (_, res) => {
                try {
                    process.wait_check_finish(res);
                } catch (e) {
                    console.error("Failed to focus workspace:", e);
                }
            });
        } catch (e) {
            console.error("Failed to execute workspace switch:", e);
        }
    }
}

export default NiriClient;
