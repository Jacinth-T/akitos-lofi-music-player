/**
 * WebSocket Server Module — extracted from the original companion app
 *
 * Runs on port 9463 and accepts connections from the Akito's Music browser app.
 * Protocol:
 *   Server → Client: { type: "hello", version, rpcReady }
 *   Client → Server: { type: "update", title, artist, artwork }
 *   Client → Server: { type: "clear" }
 *   Client → Server: { type: "ping" }
 *   Server → Client: { type: "pong", rpcReady }
 *   Server → Client: { type: "rpcStatus", rpcReady }
 */

const { EventEmitter } = require('events');
const { WebSocketServer } = require('ws');

const VERSION = '1.0.0';

class WSServer extends EventEmitter {
    /**
     * @param {number} port - Port to listen on (default: 9463)
     * @param {function} logFn - Logging function
     */
    constructor(port, logFn) {
        super();
        this._port = port || 9463;
        this._log = logFn || (() => {});
        this._wss = null;
        this._browserConnected = false;
        this._rpcReady = false;
    }

    /**
     * Start the WebSocket server.
     */
    start() {
        this._wss = new WebSocketServer({ port: this._port });

        this._wss.on('listening', () => {
            this._log(`WebSocket server running on ws://localhost:${this._port}`);
        });

        this._wss.on('connection', (ws) => {
            this._browserConnected = true;
            this._log('Browser connected');
            this.emit('browser-connected');

            // Send hello with current RPC status
            ws.send(JSON.stringify({ type: 'hello', version: VERSION, rpcReady: this._rpcReady }));

            ws.on('message', (raw) => {
                let msg;
                try { msg = JSON.parse(raw.toString()); } catch { return; }

                switch (msg.type) {
                    case 'update':
                        this.emit('track-update', {
                            title: msg.title,
                            artist: msg.artist,
                            artwork: msg.artwork
                        });
                        break;
                    case 'clear':
                        this.emit('track-clear');
                        break;
                    case 'ping':
                        ws.send(JSON.stringify({ type: 'pong', rpcReady: this._rpcReady }));
                        break;
                }
            });

            ws.on('close', () => {
                this._browserConnected = false;
                this._log('Browser disconnected');
                this.emit('browser-disconnected');
            });

            ws.on('error', (err) => this._log(`ERROR: WebSocket error: ${err.message}`));
        });

        this._wss.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                this._log(`ERROR: Port ${this._port} in use — is another instance running?`);
            }
            this._log(`ERROR: Server error: ${err.message}`);
            this.emit('error', err);
        });
    }

    /**
     * Broadcast Discord RPC status to all connected browser clients.
     * @param {boolean} connected
     */
    broadcastStatus(connected) {
        this._rpcReady = connected;
        if (!this._wss) return;
        this._wss.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'rpcStatus', rpcReady: connected }));
            }
        });
    }

    /** @returns {boolean} */
    isBrowserConnected() {
        return this._browserConnected;
    }

    /**
     * Shut down the WebSocket server.
     */
    close() {
        if (this._wss) {
            this._wss.close();
            this._wss = null;
        }
    }
}

module.exports = WSServer;
